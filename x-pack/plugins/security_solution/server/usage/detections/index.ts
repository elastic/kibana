/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller, SavedObjectsClientContract } from '../../../../../../src/core/server';
import {
  getMlJobsUsage,
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

export const defaultDetectionsUsage = {
  detection_rules: initialRulesUsage,
  ml_jobs: initialMlJobsUsage,
};

export const fetchDetectionsUsage = async (
  kibanaIndex: string,
  callCluster: LegacyAPICaller,
  ml: MlPluginSetup | undefined,
  savedObjectClient: SavedObjectsClientContract
): Promise<DetectionsUsage> => {
  const [rulesUsage, mlJobsUsage] = await Promise.allSettled([
    getRulesUsage(kibanaIndex, callCluster),
    getMlJobsUsage(ml, savedObjectClient),
  ]);

  return {
    detection_rules: rulesUsage.status === 'fulfilled' ? rulesUsage.value : initialRulesUsage,
    ml_jobs: mlJobsUsage.status === 'fulfilled' ? mlJobsUsage.value : initialMlJobsUsage,
  };
};
