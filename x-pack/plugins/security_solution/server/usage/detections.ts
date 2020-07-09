/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller } from '../../../../../src/core/server';
import { buildRuleUsage, buildMlJobUsage, fetchRules, fetchJobs } from './detections_helpers';
import { MlPluginSetup } from '../../../ml/server';

export interface DetectionRulesUsage {
  detection_rules_custom_enabled: number;
  detection_rules_custom_disabled: number;
  detection_rules_elastic_enabled: number;
  detection_rules_elastic_disabled: number;
}

export interface MlJobsUsage {
  ml_jobs_custom_enabled: number;
  ml_jobs_custom_disabled: number;
  ml_jobs_elastic_enabled: number;
  ml_jobs_elastic_disabled: number;
}

export interface DetectionsUsage extends MlJobsUsage, DetectionRulesUsage {}

export const fetchDetectionsUsage = async (
  kibanaIndex: string,
  callCluster: LegacyAPICaller,
  ml: MlPluginSetup | undefined
): Promise<DetectionsUsage> => {
  const rules = await fetchRules(kibanaIndex, callCluster);
  const jobs = await fetchJobs(ml);
  return { ...buildRuleUsage(rules), ...buildMlJobUsage(jobs) };
};
