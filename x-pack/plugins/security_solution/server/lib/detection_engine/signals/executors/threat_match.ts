/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import chunk from 'lodash/chunk';
import { Logger } from 'src/core/server';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
} from '../../../../../../alerting/server';
import { ListClient } from '../../../../../../lists/server';
import { getInputIndex } from '../get_input_output_index';
import { RuleRangeTuple, BulkCreate, WrapHits, SearchAfterAndBulkCreateReturnType } from '../types';
import { TelemetryEventsSender } from '../../../telemetry/sender';
import { BuildRuleMessage } from '../rule_messages';
import { createThreatSignals } from '../threat_mapping/create_threat_signals';
import { CompleteRule, ThreatRuleParams } from '../../schemas/rule_schemas';
import { ExperimentalFeatures } from '../../../../../common/experimental_features';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import { IRuleDataClient } from '../../../../../../rule_registry/server';
import {
  DETECTION_ENGINE_MAX_PER_PAGE,
  ELASTICSEARCH_MAX_PER_PAGE,
} from '../../../../../common/cti/constants';
import { getEventCount } from '../threat_mapping/get_threat_list';
import { EventHit } from '../threat_mapping/types';
import { fetchSourceEvents } from '../../rule_types/indicator_match/percolator/fetch_source_events';
import { percolateSourceEvents } from '../../rule_types/indicator_match/percolator/percolate_all_source_events';
import { enrichEvents } from '../../rule_types/indicator_match/percolator/enrich_events';
import { createSearchAfterReturnType } from '../utils';
import { BaseHit } from '../../../../../common/detection_engine/types';

export const threatMatchExecutor = async ({
  completeRule,
  tuple,
  listClient,
  exceptionItems,
  services,
  version,
  searchAfterSize,
  logger,
  eventsTelemetry,
  experimentalFeatures,
  buildRuleMessage,
  bulkCreate,
  wrapHits,
  percolatorRuleDataClient,
  withTimeout,
}: {
  completeRule: CompleteRule<ThreatRuleParams>;
  tuple: RuleRangeTuple;
  listClient: ListClient;
  exceptionItems: ExceptionListItemSchema[];
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  version: string;
  searchAfterSize: number;
  logger: Logger;
  eventsTelemetry: TelemetryEventsSender | undefined;
  experimentalFeatures: ExperimentalFeatures;
  buildRuleMessage: BuildRuleMessage;
  bulkCreate: BulkCreate;
  wrapHits: WrapHits;
  percolatorRuleDataClient: IRuleDataClient;
  withTimeout: <T>(func: () => Promise<T>, funcName: string) => Promise<T>;
}) => {
  return withSecuritySpan('threatMatchExecutor', async () => {
    const logDebugMessage = (message: string) => logger.debug(buildRuleMessage(message));
    logDebugMessage('Indicator matching rule starting');

    let results = createSearchAfterReturnType();
    if (tuple == null || tuple.to == null || tuple.from == null) {
      logDebugMessage(`[-] malformed date tuple`);
      return { ...results, success: false, errors: ['malformed date tuple'] };
    }

    const { filters, index, language, query, maxSignals, timestampOverride } =
      completeRule.ruleParams;
    const inputIndex = await getInputIndex({
      experimentalFeatures,
      services,
      version,
      index,
    });

    const matchableSourceEventCount = await withTimeout<number>(
      () =>
        getEventCount({
          esClient: services.scopedClusterClient.asCurrentUser,
          exceptionItems,
          filters: filters ?? [],
          index: inputIndex,
          language,
          query,
          timestampOverride,
          tuple,
        }),
      'getTotalEventCount'
    );
    logDebugMessage(`matchable source event count: ${matchableSourceEventCount}`);
    console.log('____sourceCount', matchableSourceEventCount);

    if (matchableSourceEventCount) {
      const sourceEventHits: EventHit[] = await fetchSourceEvents({
        buildRuleMessage,
        esClient: services.search.asCurrentUser,
        exceptionItems,
        listClient,
        logger,
        perPage: DETECTION_ENGINE_MAX_PER_PAGE,
        filters: filters ?? [],
        index: inputIndex,
        language,
        query,
      });

      const chunkedSourceEventHits = chunk(sourceEventHits, ELASTICSEARCH_MAX_PER_PAGE);

      const matchedPercolateQueriesByChunk = await percolateSourceEvents({
        chunkedSourceEventHits,
        percolatorRuleDataClient,
      });

      const enrichedEvents: Array<BaseHit<Record<string, unknown>>> = enrichEvents({
        chunkedSourceEventHits,
        matchedPercolateQueriesByChunk,
      });

      results = await bulkCreate(enrichedEvents);
    }

    console.log('____IM rule execution complete');
    logDebugMessage('Indicator matching rule has completed');
    return results;
  });
};
