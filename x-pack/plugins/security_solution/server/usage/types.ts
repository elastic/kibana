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

/**
 * This type is _very_ similar to "RawRule". However, that type is not exposed in a non-restricted-path
 * and it does not support generics well. Trying to use "RawRule" directly with TypeScript Omit does not work well.
 * If at some point the rules client API supports cross spaces for gathering metrics, then we should remove our use
 * of SavedObject types and this type below and instead natively use the rules client.
 *
 * NOTE: There are additional types not expressed below such as "apiKey" or there could be other slight differences
 * but this will the easiest way to keep these in sync and I see other code that is similar to this pattern.
 * {@see RawRule}
 */
export type RuleSearchResult = Omit<
  SanitizedAlert<RuleParams>,
  'createdBy' | 'updatedBy' | 'createdAt' | 'updatedAt'
> & {
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};
