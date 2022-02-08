/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from 'src/core/server';
import type { SanitizedAlert } from '../../../alerting/common/alert';
import type { RuleParams } from '../lib/detection_engine/schemas/rule_schemas';
import type { SetupPlugins } from '../plugin';

export type CollectorDependencies = {
  kibanaIndex: string;
  signalsIndex: string;
  core: CoreSetup;
  logger: Logger;
} & Pick<SetupPlugins, 'ml' | 'usageCollection'>;

export interface AlertBucket {
  key: {
    detectionAlerts: string;
  };
  doc_count: number;
}

export interface AlertAggs {
  buckets?: {
    after_key?: {
      detectionAlerts: string;
    };
    buckets: AlertBucket[];
  };
}

export interface RuleSearchResult {
  alert: SanitizedAlert<RuleParams>;
}
