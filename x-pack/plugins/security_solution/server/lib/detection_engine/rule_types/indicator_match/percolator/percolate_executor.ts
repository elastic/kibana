/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PercolateExecutorOptions } from '../../../signals/types';
import { withSecuritySpan } from '../../../../../utils/with_security_span';
import { getInputIndex } from '../../../signals/get_input_output_index';
import { createSearchAfterReturnType, mergeReturns } from '../../../signals/utils';
import { fetchPercolateEnrichEvents } from './fetch_source_events';
import {
  DEFAULT_INDICATOR_SOURCE_PATH,
  DETECTION_ENGINE_MAX_PER_PAGE,
} from '../../../../../../common/constants';
import { updatePercolatorIndex } from './update_percolator_index';
import { getEventCount } from '../../../signals/threat_mapping/get_event_count';
import { buildReasonMessageForThreatMatchAlert } from '../../../signals/reason_formatters';
import { EventCountOptions } from '../../../signals/threat_mapping/types';
import { sendAlertTelemetryEventsFromHits } from '../../../signals/send_telemetry_events';

export const percolateExecutor = ({
  buildRuleMessage,
  bulkCreate,
  completeRule,
  eventsTelemetry,
  exceptionItems,
  experimentalFeatures,
  listClient,
  logger,
  percolatorRuleDataClient,
  services,
  spaceId,
  tuple,
  tupleIndex,
  version,
  withTimeout,
  wrapHits,
}: PercolateExecutorOptions) =>
  withSecuritySpan('percolateExecutor', async () => {
    const logDebugMessage = (message: string) => logger.debug(buildRuleMessage(message));
    logDebugMessage('Indicator matching rule starting');

    let results = createSearchAfterReturnType();
    if (tuple == null || tuple.to == null || tuple.from == null) {
      logDebugMessage(`[-] malformed date tuple`);
      return { ...results, success: false, errors: ['malformed date tuple'] };
    }

    const {
      filters = [],
      index,
      language,
      query,
      threatFilters = [],
      threatIndex,
      threatLanguage,
      threatMapping,
      threatQuery,
      timestampOverride,
      version: ruleVersion,
      indicatorTimestampOverride,
      threatIndicatorPath = DEFAULT_INDICATOR_SOURCE_PATH,
    } = completeRule.ruleParams;
    const abortableEsClient = services.search.asCurrentUser;
    const esClient = services.scopedClusterClient.asCurrentUser;
    const inputIndex = await getInputIndex({
      experimentalFeatures,
      services,
      version,
      index,
    });
    const perPage = DETECTION_ENGINE_MAX_PER_PAGE;
    const ruleId = completeRule.alertId;

    const matchableSourceEventCount = await withTimeout<number, EventCountOptions>(getEventCount, {
      esClient,
      exceptionItems,
      filters,
      index: inputIndex,
      language,
      query,
      timestampOverride,
      tuple,
    });
    logDebugMessage(`matchable source event count: ${matchableSourceEventCount}`);

    console.log('____matchableEventCOunt', matchableSourceEventCount);

    if (matchableSourceEventCount) {
      if (tupleIndex === 0) {
        try {
          await updatePercolatorIndex({
            abortableEsClient,
            esClient,
            exceptionItems: [],
            logDebugMessage,
            percolatorRuleDataClient,
            perPage,
            ruleId,
            ruleVersion,
            spaceId,
            timestampOverride: indicatorTimestampOverride,
            threatFilters,
            threatIndex,
            threatIndicatorPath,
            threatLanguage,
            threatMapping,
            threatQuery,
            withTimeout,
          });
          logDebugMessage('percolator index update complete');
        } catch (e) {
          logDebugMessage('unable to update percolator index');
          return {
            ...results,
            success: false,
            errors: [`${e}`],
          };
        }
      }

      const start = performance.now();

      const {
        enrichedHits,
        errors: fetchSourceEventsErrors,
        success: fetchSourceEventsSuccess,
      } = await fetchPercolateEnrichEvents({
        buildRuleMessage,
        exceptionsList: exceptionItems,
        filters,
        index: inputIndex,
        listClient,
        services,
        language,
        logger,
        perPage,
        query,
        threatIndicatorPath,
        tuple,
        percolatorRuleDataClient,
        ruleId,
        ruleVersion,
        spaceId,
      });

      if (!fetchSourceEventsSuccess) {
        return {
          ...results,
          success: false,
          errors: fetchSourceEventsErrors,
        };
      }

      const end = performance.now();

      results.searchAfterTimes = [(end - start).toString()];

      console.log(JSON.stringify(enrichedHits[0]));

      const alertCandidates = wrapHits(
        enrichedHits.slice(0, tuple.maxSignals),
        buildReasonMessageForThreatMatchAlert
      );

      console.log(JSON.stringify(alertCandidates[0]));

      const {
        bulkCreateDuration: bulkDuration,
        createdItemsCount: createdCount,
        createdItems,
        success: bulkSuccess,
        errors: bulkErrors,
      } = await bulkCreate(alertCandidates);

      results = mergeReturns([
        results,
        createSearchAfterReturnType({
          success: bulkSuccess,
          createdSignalsCount: createdCount,
          createdSignals: createdItems,
          bulkCreateTimes: bulkDuration ? [bulkDuration] : undefined,
          errors: bulkErrors,
        }),
      ]);

      sendAlertTelemetryEventsFromHits(logger, eventsTelemetry, alertCandidates, buildRuleMessage);
    }

    logDebugMessage('Indicator matching rule has completed');
    return results;
  });
