/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CNVM_POLICY_TEMPLATE,
  CSPM_POLICY_TEMPLATE,
  KSPM_POLICY_TEMPLATE,
  LATEST_FINDINGS_INDEX_PATTERN,
  LATEST_VULNERABILITIES_INDEX_PATTERN,
} from '@kbn/cloud-security-posture-plugin/common/constants';
import { INTEGRATION_PACKAGE_NAME } from '@kbn/cloud-defend-plugin/common/constants';

const CLOUD_DEFEND_HEARTBEAT_INDEX = 'metrics-cloud_defend.heartbeat';
export const CLOUD_SECURITY_TASK_TYPE = 'cloud_security';
export const AGGREGATION_PRECISION_THRESHOLD = 40000;
export const ASSETS_SAMPLE_GRANULARITY = '24h';
export const THRESHOLD_MINUTES = 30;

export const CSPM = CSPM_POLICY_TEMPLATE;
export const KSPM = KSPM_POLICY_TEMPLATE;
export const CNVM = CNVM_POLICY_TEMPLATE;
export const CLOUD_DEFEND = INTEGRATION_PACKAGE_NAME;

export const METERING_CONFIGS = {
  [CSPM]: {
    index: LATEST_FINDINGS_INDEX_PATTERN,
    assets_identifier: 'resource.id',
  },
  [KSPM]: {
    index: LATEST_FINDINGS_INDEX_PATTERN,
    assets_identifier: 'agent.id',
  },
  [CNVM]: {
    index: LATEST_VULNERABILITIES_INDEX_PATTERN,
    assets_identifier: 'cloud.instance.id',
  },
  [CLOUD_DEFEND]: {
    index: CLOUD_DEFEND_HEARTBEAT_INDEX,
    assets_identifier: 'agent.id',
  },
};
