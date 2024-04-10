/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { performance } from 'perf_hooks';
import type { SuppressedAlertService } from '@kbn/rule-registry-plugin/server';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Filter } from '@kbn/es-query';
import { buildEqlSearchRequest } from './build_eql_search_request';
import { createEnrichEventsFunction } from '../utils/enrichments';

import type {
  BulkCreate,
  WrapHits,
  WrapSequences,
  RuleRangeTuple,
  SearchAfterAndBulkCreateReturnType,
  SignalSource,
  WrapSuppressedHits,
} from '../types';
import {
  addToSearchAfterReturn,
  createSearchAfterReturnType,
  makeFloatString,
  getUnprocessedExceptionsWarnings,
  getMaxSignalsWarning,
  getSuppressionMaxSignalsWarning,
} from '../utils/utils';
import { buildReasonMessageForEqlAlert } from '../utils/reason_formatters';
import type { CompleteRule, EqlRuleParams } from '../../rule_schema';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import type {
  BaseFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../common/api/detection_engine/model/alerts';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
import { bulkCreateSuppressedAlertsInMemory } from '../utils/bulk_create_suppressed_alerts_in_memory';

interface EqlExecutorParams {
  inputIndex: string[];
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
  completeRule: CompleteRule<EqlRuleParams>;
  tuple: RuleRangeTuple;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  version: string;
  bulkCreate: BulkCreate;
  wrapHits: WrapHits;
  wrapSequences: WrapSequences;
  primaryTimestamp: string;
  secondaryTimestamp?: string;
  exceptionFilter: Filter | undefined;
  unprocessedExceptions: ExceptionListItemSchema[];
  wrapSuppressedHits: WrapSuppressedHits;
  alertTimestampOverride: Date | undefined;
  alertWithSuppression: SuppressedAlertService;
  isAlertSuppressionActive: boolean;
}

export const eqlExecutor = async ({
  inputIndex,
  runtimeMappings,
  completeRule,
  tuple,
  ruleExecutionLogger,
  services,
  version,
  bulkCreate,
  wrapHits,
  wrapSequences,
  primaryTimestamp,
  secondaryTimestamp,
  exceptionFilter,
  unprocessedExceptions,
  wrapSuppressedHits,
  alertTimestampOverride,
  alertWithSuppression,
  isAlertSuppressionActive,
}: EqlExecutorParams): Promise<SearchAfterAndBulkCreateReturnType> => {
  const ruleParams = completeRule.ruleParams;

  return withSecuritySpan('eqlExecutor', async () => {
    const result = createSearchAfterReturnType();

    const request = buildEqlSearchRequest({
      query: ruleParams.query,
      index: inputIndex,
      from: tuple.from.toISOString(),
      to: tuple.to.toISOString(),
      size: ruleParams.maxSignals,
      filters: ruleParams.filters,
      primaryTimestamp,
      secondaryTimestamp,
      runtimeMappings,
      eventCategoryOverride: ruleParams.eventCategoryOverride,
      timestampField: ruleParams.timestampField,
      tiebreakerField: ruleParams.tiebreakerField,
      exceptionFilter,
    });

    ruleExecutionLogger.debug(`EQL query request: ${JSON.stringify(request)}`);
    const exceptionsWarning = getUnprocessedExceptionsWarnings(unprocessedExceptions);
    if (exceptionsWarning) {
      result.warningMessages.push(exceptionsWarning);
    }
    const eqlSignalSearchStart = performance.now();

    try {
      const response = await services.scopedClusterClient.asCurrentUser.eql.search<SignalSource>(
        request
      );

      const eqlSignalSearchEnd = performance.now();
      const eqlSearchDuration = makeFloatString(eqlSignalSearchEnd - eqlSignalSearchStart);
      result.searchAfterTimes = [eqlSearchDuration];

      let newSignals: Array<WrappedFieldsLatest<BaseFieldsLatest>> | undefined;

      const { events, sequences } = response.hits;

      if (events) {
        if (isAlertSuppressionActive) {
          await bulkCreateSuppressedAlertsInMemory({
            enrichedEvents: events,
            toReturn: result,
            wrapHits,
            bulkCreate,
            services,
            buildReasonMessage: buildReasonMessageForEqlAlert,
            ruleExecutionLogger,
            tuple,
            alertSuppression: completeRule.ruleParams.alertSuppression,
            wrapSuppressedHits,
            alertTimestampOverride,
            alertWithSuppression,
          });
        } else {
          newSignals = wrapHits(events, buildReasonMessageForEqlAlert);
        }
      } else if (sequences) {
        if (isAlertSuppressionActive && completeRule.ruleParams.alertSuppression) {
          result.warningMessages.push(
            'Suppression is not supported for EQL sequence queries. The rule will proceed without suppression.'
          );
        }
        newSignals = wrapSequences(sequences, buildReasonMessageForEqlAlert);
      } else {
        throw new Error(
          'eql query response should have either `sequences` or `events` but had neither'
        );
      }

      if (newSignals?.length) {
        const createResult = await bulkCreate(
          newSignals,
          undefined,
          createEnrichEventsFunction({
            services,
            logger: ruleExecutionLogger,
          })
        );
        addToSearchAfterReturn({ current: result, next: createResult });
      }

      if (response.hits.total && response.hits.total.value >= ruleParams.maxSignals) {
        const maxSignalsWarning =
          isAlertSuppressionActive && events?.length
            ? getSuppressionMaxSignalsWarning()
            : getMaxSignalsWarning();

        result.warningMessages.push(maxSignalsWarning);
      }

      return result;
    } catch (error) {
      if (
        typeof error.message === 'string' &&
        (error.message as string).includes('verification_exception')
      ) {
        // We report errors that are more related to user configuration of rules rather than system outages as "user errors"
        // so SLO dashboards can show less noise around system outages
        result.userError = true;
      }
      result.errors.push(error.message);
      result.success = false;
      return result;
    }
  });
};
