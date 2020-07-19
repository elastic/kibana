/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller } from '../../../../../../src/core/server';
import { getMlJobsUsage, getRulesUsage } from './detections_helpers';
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

export const fetchDetectionsUsage = async (
  kibanaIndex: string,
  callCluster: LegacyAPICaller,
  ml: MlPluginSetup | undefined
): Promise<DetectionsUsage> => {
  const rulesUsage = await getRulesUsage(kibanaIndex, callCluster);
  const mlJobsUsage = await getMlJobsUsage(ml);
  return { detection_rules: rulesUsage, ml_jobs: mlJobsUsage };
};
