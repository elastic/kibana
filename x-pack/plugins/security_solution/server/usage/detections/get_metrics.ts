/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract, Logger } from 'kibana/server';
import type { MlPluginSetup } from '../../../../ml/server';
import type { DetectionMetrics } from './types';

import { getMlJobMetrics } from './ml_jobs/get_metrics';
import { getRuleMetrics } from './rules/get_metrics';
import { getInitialRulesUsage } from './rules/get_initial_usage';
import { getInitialMlJobUsage } from './ml_jobs/get_initial_usage';

export interface GetDetectionsMetricsOptions {
  signalsIndex: string;
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
  mlClient: MlPluginSetup | undefined;
}

export const getDetectionsMetrics = async ({
  signalsIndex,
  esClient,
  savedObjectsClient,
  logger,
  mlClient,
}: GetDetectionsMetricsOptions): Promise<DetectionMetrics> => {
  const [mlJobMetrics, detectionRuleMetrics] = await Promise.allSettled([
    getMlJobMetrics({ mlClient, savedObjectsClient, logger }),
    getRuleMetrics({ signalsIndex, esClient, savedObjectsClient, logger }),
  ]);

  return {
    ml_jobs:
      mlJobMetrics.status === 'fulfilled'
        ? mlJobMetrics.value
        : { ml_job_metrics: [], ml_job_usage: getInitialMlJobUsage() },
    detection_rules:
      detectionRuleMetrics.status === 'fulfilled'
        ? detectionRuleMetrics.value
        : { detection_rule_detail: [], detection_rule_usage: getInitialRulesUsage() },
  };
};
