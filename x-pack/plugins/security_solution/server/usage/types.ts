/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface DetectionRulesAdoptionUsage {
  detection_rules_custom_enabled: number;
  detection_rules_custom_disabled: number;
  detection_rules_elastic_enabled: number;
  detection_rules_elastic_disabled: number;
}

export interface MlJobsAdoptionUsage {
  ml_jobs_custom_enabled: number;
  ml_jobs_custom_disabled: number;
  ml_jobs_elastic_enabled: number;
  ml_jobs_elastic_disabled: number;
}

export type AdoptionUsage = DetectionRulesAdoptionUsage & MlJobsAdoptionUsage;
