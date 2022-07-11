/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import type { ListClient } from '@kbn/lists-plugin/server';
import { isJobStarted } from '../../../../../common/machine_learning/helpers';
import type { CompleteRule, MachineLearningRuleParams } from '../../schemas/rule_schemas';
import { bulkCreateMlSignals } from '../bulk_create_ml_signals';
import { filterEventsAgainstList } from '../filters/filter_events_against_list';
import { findMlSignals } from '../find_ml_signals';
import type { BuildRuleMessage } from '../rule_messages';
import type { BulkCreate, RuleRangeTuple, WrapHits } from '../types';
import { createErrorsFromShard, createSearchAfterReturnType, mergeReturns } from '../utils';
import type { SetupPlugins } from '../../../../plugin';
import { withSecuritySpan } from '../../../../utils/with_security_span';

export const mlExecutor = async ({
  completeRule,
  tuple,
  ml,
  listClient,
  exceptionItems,
  services,
  logger,
  buildRuleMessage,
  bulkCreate,
  wrapHits,
}: {
  completeRule: CompleteRule<MachineLearningRuleParams>;
  tuple: RuleRangeTuple;
  ml: SetupPlugins['ml'];
  listClient: ListClient;
  exceptionItems: ExceptionListItemSchema[];
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  logger: Logger;
  buildRuleMessage: BuildRuleMessage;
  bulkCreate: BulkCreate;
  wrapHits: WrapHits;
}) => {
  const result = createSearchAfterReturnType();
  const ruleParams = completeRule.ruleParams;

  return withSecuritySpan('mlExecutor', async () => {
    if (ml == null) {
      throw new Error('ML plugin unavailable during rule execution');
    }

    // Using fake KibanaRequest as it is needed to satisfy the ML Services API, but can be empty as it is
    // currently unused by the jobsSummary function.
    const fakeRequest = {} as KibanaRequest;
    const summaryJobs = await ml
      .jobServiceProvider(fakeRequest, services.savedObjectsClient)
      .jobsSummary(ruleParams.machineLearningJobId);
    const jobSummaries = summaryJobs.filter((job) =>
      ruleParams.machineLearningJobId.includes(job.id)
    );

    if (
      jobSummaries.length < 1 ||
      jobSummaries.some((job) => !isJobStarted(job.jobState, job.datafeedState))
    ) {
      const warningMessage = buildRuleMessage(
        'Machine learning job(s) are not started:',
        ...jobSummaries.map((job) =>
          [
            `job id: "${job.id}"`,
            `job status: "${job.jobState}"`,
            `datafeed status: "${job.datafeedState}"`,
          ].join(', ')
        )
      );
      result.warningMessages.push(warningMessage);
      logger.warn(warningMessage);
      result.warning = true;
    }

    const anomalyResults = await findMlSignals({
      ml,
      // Using fake KibanaRequest as it is needed to satisfy the ML Services API, but can be empty as it is
      // currently unused by the mlAnomalySearch function.
      request: {} as unknown as KibanaRequest,
      savedObjectsClient: services.savedObjectsClient,
      jobIds: ruleParams.machineLearningJobId,
      anomalyThreshold: ruleParams.anomalyThreshold,
      from: tuple.from.toISOString(),
      to: tuple.to.toISOString(),
      exceptionItems,
    });

    const [filteredAnomalyHits, _] = await filterEventsAgainstList({
      listClient,
      exceptionsList: exceptionItems,
      logger,
      events: anomalyResults.hits.hits,
      buildRuleMessage,
    });

    const anomalyCount = filteredAnomalyHits.length;
    if (anomalyCount) {
      logger.debug(buildRuleMessage(`Found ${anomalyCount} signals from ML anomalies.`));
    }
    const { success, errors, bulkCreateDuration, createdItemsCount, createdItems } =
      await bulkCreateMlSignals({
        anomalyHits: filteredAnomalyHits,
        completeRule,
        services,
        logger,
        id: completeRule.alertId,
        signalsIndex: ruleParams.outputIndex,
        buildRuleMessage,
        bulkCreate,
        wrapHits,
      });
    // The legacy ES client does not define failures when it can be present on the structure, hence why I have the & { failures: [] }
    const shardFailures =
      (
        anomalyResults._shards as typeof anomalyResults._shards & {
          failures: [];
        }
      ).failures ?? [];
    const searchErrors = createErrorsFromShard({
      errors: shardFailures,
    });
    return mergeReturns([
      result,
      createSearchAfterReturnType({
        success: success && anomalyResults._shards.failed === 0,
        errors: [...errors, ...searchErrors],
        createdSignalsCount: createdItemsCount,
        createdSignals: createdItems,
        bulkCreateTimes: bulkCreateDuration ? [bulkCreateDuration] : [],
      }),
    ]);
  });
};
