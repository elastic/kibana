/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CSPM_POLICY_TEMPLATE,
  KSPM_POLICY_TEMPLATE,
  CNVM_POLICY_TEMPLATE,
} from '@kbn/cloud-security-posture-plugin/common/constants';
import type { MeteringCallbackInput, Tier } from '../types';

export interface ResourceCountAggregation {
  min_timestamp: MinTimestamp;
  unique_assets: {
    value: number;
  };
}

export interface MinTimestamp {
  value: number;
  value_as_string: string;
}

export type PostureType =
  | typeof CSPM_POLICY_TEMPLATE
  | typeof KSPM_POLICY_TEMPLATE
  | typeof CNVM_POLICY_TEMPLATE;

export interface CloudSecurityMeteringCallbackInput
  extends Omit<MeteringCallbackInput, 'cloudSetup' | 'abortController' | 'config'> {
  projectId: string;
  postureType: PostureType;
  tier: Tier;
}
