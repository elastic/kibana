/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';
import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';

import {
  computeIsESQLQueryAggregating,
  getIndexListFromEsqlQuery,
} from '@kbn/securitysolution-utils';
import { buildEsqlSearchRequest } from './build_esql_search_request';
import { performEsqlRequest } from './esql_request';
import { wrapEsqlAlerts } from './wrap_esql_alerts';
import { createEnrichEventsFunction } from '../utils/enrichments';
import { rowToDocument } from './utils';
import { fetchSourceDocuments } from './fetch_source_documents';

import type { RunOpts } from '../types';

import {
  addToSearchAfterReturn,
  createSearchAfterReturnType,
  makeFloatString,
  getUnprocessedExceptionsWarnings,
  getMaxSignalsWarning,
} from '../utils/utils';
import type { EsqlRuleParams } from '../../rule_schema';
import { withSecuritySpan } from '../../../../utils/with_security_span';

export const esqlExecutor = async ({
  runOpts: {
    completeRule,
    tuple,
    ruleExecutionLogger,
    bulkCreate,
    mergeStrategy,
    primaryTimestamp,
    secondaryTimestamp,
    exceptionFilter,
    unprocessedExceptions,
    alertTimestampOverride,
    publicBaseUrl,
  },
  services,
  state,
  spaceId,
}: {
  runOpts: RunOpts<EsqlRuleParams>;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  state: object;
  spaceId: string;
  version: string;
}) => {
  const ruleParams = completeRule.ruleParams;

  return withSecuritySpan('esqlExecutor', async () => {
    const result = createSearchAfterReturnType();

    const esqlRequest = buildEsqlSearchRequest({
      query: ruleParams.query,
      from: tuple.from.toISOString(),
      to: tuple.to.toISOString(),
      size: ruleParams.maxSignals,
      filters: [],
      primaryTimestamp,
      secondaryTimestamp,
      exceptionFilter,
    });

    ruleExecutionLogger.debug(`ES|QL query request: ${JSON.stringify(esqlRequest)}`);
    const exceptionsWarning = getUnprocessedExceptionsWarnings(unprocessedExceptions);
    if (exceptionsWarning) {
      result.warningMessages.push(exceptionsWarning);
    }

    const esqlSignalSearchStart = performance.now();

    const response = await performEsqlRequest({
      esClient: services.scopedClusterClient.asCurrentUser,
      requestParams: esqlRequest,
    });

    const esqlSearchDuration = makeFloatString(performance.now() - esqlSignalSearchStart);
    result.searchAfterTimes = [esqlSearchDuration];

    ruleExecutionLogger.debug(`ES|QL query request took: ${esqlSearchDuration}ms`);

    const isRuleAggregating = computeIsESQLQueryAggregating(completeRule.ruleParams.query);
    const results = response.values
      .slice(0, completeRule.ruleParams.maxSignals)
      .map((row) => rowToDocument(response.columns, row));

    const index = getIndexListFromEsqlQuery(completeRule.ruleParams.query);

    const sourceDocuments = await fetchSourceDocuments({
      esClient: services.scopedClusterClient.asCurrentUser,
      results,
      index,
      isRuleAggregating,
    });

    const wrappedAlerts = wrapEsqlAlerts({
      sourceDocuments,
      isRuleAggregating,
      results,
      spaceId,
      completeRule,
      mergeStrategy,
      alertTimestampOverride,
      ruleExecutionLogger,
      publicBaseUrl,
      tuple,
    });

    const enrichAlerts = createEnrichEventsFunction({
      services,
      logger: ruleExecutionLogger,
    });
    const bulkCreateResult = await bulkCreate(wrappedAlerts, tuple.maxSignals, enrichAlerts);

    addToSearchAfterReturn({ current: result, next: bulkCreateResult });
    ruleExecutionLogger.debug(`Created ${bulkCreateResult.createdItemsCount} alerts`);

    if (response.values.length > ruleParams.maxSignals) {
      result.warningMessages.push(getMaxSignalsWarning());
    }

    return { ...result, state };
  });
};
