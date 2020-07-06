/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CategorizationAnalyzer } from './categories';

export interface MlServerDefaults {
  anomaly_detectors: {
    categorization_examples_limit?: number;
    model_memory_limit?: string;
    model_snapshot_retention_days?: number;
    categorization_analyzer?: CategorizationAnalyzer;
  };
  datafeeds: { scroll_size?: number };
}

export interface MlServerLimits {
  max_model_memory_limit?: string;
  effective_max_model_memory_limit?: string;
}

export interface MlInfoResponse {
  defaults: MlServerDefaults;
  limits: MlServerLimits;
  native_code: {
    build_hash: string;
    version: string;
  };
  upgrade_mode: boolean;
  cloudId?: string;
}
