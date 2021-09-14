/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, SavedObjectsClientContract } from '../../../../../../src/core/server';
import { MlPluginSetup } from '../../../../ml/server';
import { getDetectionRuleMetrics, initialDetectionRulesUsage } from './detection_rule_helpers';
import { getMlJobMetrics, initialMlJobsUsage } from './detection_ml_helpers';
import { DetectionMetrics } from './types';

import { INTERNAL_IMMUTABLE_KEY } from '../../../common/constants';

export const isElasticRule = (tags: string[] = []) =>
  tags.includes(`${INTERNAL_IMMUTABLE_KEY}:true`);

export const fetchDetectionsMetrics = async (
  kibanaIndex: string,
  signalsIndex: string,
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  mlClient: MlPluginSetup | undefined
): Promise<DetectionMetrics> => {
  const [mlJobMetrics, detectionRuleMetrics] = await Promise.allSettled([
    getMlJobMetrics(mlClient, soClient),
    getDetectionRuleMetrics(kibanaIndex, signalsIndex, esClient, soClient),
  ]);

  return {
    ml_jobs:
      mlJobMetrics.status === 'fulfilled'
        ? mlJobMetrics.value
        : { ml_job_metrics: [], ml_job_usage: initialMlJobsUsage },
    detection_rules:
      detectionRuleMetrics.status === 'fulfilled'
        ? detectionRuleMetrics.value
        : { detection_rule_detail: [], detection_rule_usage: initialDetectionRulesUsage },
  };
};
