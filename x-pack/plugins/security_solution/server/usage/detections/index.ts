/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient, SavedObjectsClientContract } from '../../../../../../src/core/server';
import {
  getMlJobsUsage,
  getMlJobMetrics,
  getRulesUsage,
  initialRulesUsage,
  initialMlJobsUsage,
} from './detections_helpers';
import { MlPluginSetup } from '../../../../ml/server';

interface FeatureUsage {
  enabled: number;
  disabled: number;
}

export interface DetectionRulesUsage {
  custom: FeatureUsage;
  elastic: FeatureUsage;
}

export interface MlJobsUsage {
  custom: FeatureUsage;
  elastic: FeatureUsage;
}

export interface DetectionsUsage {
  detection_rules: DetectionRulesUsage;
  ml_jobs: MlJobsUsage;
}

export interface DetectionMetrics {
  ml_jobs: MlJobMetric[];
}

export interface MlJobMetric {
  job_id: string;
  time_start: number;
  time_finish: number;
}

export const defaultDetectionsUsage = {
  detection_rules: initialRulesUsage,
  ml_jobs: initialMlJobsUsage,
};

export const fetchDetectionsUsage = async (
  kibanaIndex: string,
  esClient: ElasticsearchClient,
  ml: MlPluginSetup | undefined,
  savedObjectClient: SavedObjectsClientContract
): Promise<DetectionsUsage> => {
  const [rulesUsage, mlJobsUsage] = await Promise.allSettled([
    getRulesUsage(kibanaIndex, esClient),
    getMlJobsUsage(ml, savedObjectClient),
  ]);

  return {
    detection_rules: rulesUsage.status === 'fulfilled' ? rulesUsage.value : initialRulesUsage,
    ml_jobs: mlJobsUsage.status === 'fulfilled' ? mlJobsUsage.value : initialMlJobsUsage,
  };
};

export const fetchDetectionMetrics = async (
  ml: MlPluginSetup | undefined,
  savedObjectClient: SavedObjectsClientContract
): Promise<DetectionMetrics> => {
  const mlJobMetrics = await getMlJobMetrics(ml, savedObjectClient);

  return {
    ml_jobs: mlJobMetrics.status === 'fulfilled' ? mlJobMetrics.value : {},
  };
};
