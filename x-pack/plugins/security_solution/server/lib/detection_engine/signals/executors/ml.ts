/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, Logger } from 'src/core/server';
import { SavedObject } from 'src/core/types';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
} from '../../../../../../alerting/server';
import { ListClient } from '../../../../../../lists/server';
import { isJobStarted } from '../../../../../common/machine_learning/helpers';
import { ExceptionListItemSchema } from '../../../../../common/shared_imports';
import { SetupPlugins } from '../../../../plugin';
import { RefreshTypes } from '../../types';
import { bulkCreateMlSignals } from '../bulk_create_ml_signals';
import { filterEventsAgainstList } from '../filters/filter_events_against_list';
import { findMlSignals } from '../find_ml_signals';
import { BuildRuleMessage } from '../rule_messages';
import { RuleStatusService } from '../rule_status_service';
import { MachineLearningRuleAttributes } from '../types';
import { createErrorsFromShard, createSearchAfterReturnType, mergeReturns } from '../utils';

export const mlExecutor = async ({
  rule,
  ml,
  listClient,
  exceptionItems,
  ruleStatusService,
  services,
  logger,
  refresh,
  buildRuleMessage,
}: {
  rule: SavedObject<MachineLearningRuleAttributes>;
  ml: SetupPlugins['ml'];
  listClient: ListClient;
  exceptionItems: ExceptionListItemSchema[];
  ruleStatusService: RuleStatusService;
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  logger: Logger;
  refresh: RefreshTypes;
  buildRuleMessage: BuildRuleMessage;
}) => {
  const result = createSearchAfterReturnType();
  const ruleParams = rule.attributes.params;
  if (ml == null) {
    throw new Error('ML plugin unavailable during rule execution');
  }

  // Using fake KibanaRequest as it is needed to satisfy the ML Services API, but can be empty as it is
  // currently unused by the jobsSummary function.
  const fakeRequest = {} as KibanaRequest;
  const summaryJobs = await ml
    .jobServiceProvider(fakeRequest, services.savedObjectsClient)
    .jobsSummary([ruleParams.machineLearningJobId]);
  const jobSummary = summaryJobs.find((job) => job.id === ruleParams.machineLearningJobId);

  if (jobSummary == null || !isJobStarted(jobSummary.jobState, jobSummary.datafeedState)) {
    const errorMessage = buildRuleMessage(
      'Machine learning job is not started:',
      `job id: "${ruleParams.machineLearningJobId}"`,
      `job status: "${jobSummary?.jobState}"`,
      `datafeed status: "${jobSummary?.datafeedState}"`
    );
    logger.warn(errorMessage);
    result.warning = true;
    // TODO: change this to partialFailure since we don't immediately exit rule function and still do actions at the end?
    await ruleStatusService.error(errorMessage);
  }

  const anomalyResults = await findMlSignals({
    ml,
    // Using fake KibanaRequest as it is needed to satisfy the ML Services API, but can be empty as it is
    // currently unused by the mlAnomalySearch function.
    request: ({} as unknown) as KibanaRequest,
    savedObjectsClient: services.savedObjectsClient,
    jobId: ruleParams.machineLearningJobId,
    anomalyThreshold: ruleParams.anomalyThreshold,
    from: ruleParams.from,
    to: ruleParams.to,
    exceptionItems,
  });

  const filteredAnomalyResults = await filterEventsAgainstList({
    listClient,
    exceptionsList: exceptionItems,
    logger,
    eventSearchResult: anomalyResults,
    buildRuleMessage,
  });

  const anomalyCount = filteredAnomalyResults.hits.hits.length;
  if (anomalyCount) {
    logger.info(buildRuleMessage(`Found ${anomalyCount} signals from ML anomalies.`));
  }
  const {
    success,
    errors,
    bulkCreateDuration,
    createdItemsCount,
    createdItems,
  } = await bulkCreateMlSignals({
    actions: rule.attributes.actions,
    throttle: rule.attributes.throttle,
    someResult: filteredAnomalyResults,
    ruleParams,
    services,
    logger,
    id: rule.id,
    signalsIndex: ruleParams.outputIndex,
    name: rule.attributes.name,
    createdBy: rule.attributes.createdBy,
    createdAt: rule.attributes.createdAt,
    updatedBy: rule.attributes.updatedBy,
    updatedAt: rule.updated_at ?? '',
    interval: rule.attributes.schedule.interval,
    enabled: rule.attributes.enabled,
    refresh,
    tags: rule.attributes.tags,
    buildRuleMessage,
  });
  // The legacy ES client does not define failures when it can be present on the structure, hence why I have the & { failures: [] }
  const shardFailures =
    (filteredAnomalyResults._shards as typeof filteredAnomalyResults._shards & {
      failures: [];
    }).failures ?? [];
  const searchErrors = createErrorsFromShard({
    errors: shardFailures,
  });
  return mergeReturns([
    result,
    createSearchAfterReturnType({
      success: success && filteredAnomalyResults._shards.failed === 0,
      errors: [...errors, ...searchErrors],
      createdSignalsCount: createdItemsCount,
      createdSignals: createdItems,
      bulkCreateTimes: bulkCreateDuration ? [bulkCreateDuration] : [],
    }),
  ]);
};
