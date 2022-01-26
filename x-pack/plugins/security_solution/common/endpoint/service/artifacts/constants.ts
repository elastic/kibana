/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENDPOINT_TRUSTED_APPS_LIST_ID,
  ENDPOINT_EVENT_FILTERS_LIST_ID,
  ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID,
} from '@kbn/securitysolution-list-constants';

export const BY_POLICY_ARTIFACT_TAG_PREFIX = 'policy:';

export const GLOBAL_ARTIFACT_TAG = `${BY_POLICY_ARTIFACT_TAG_PREFIX}all`;

export const ALL_ENDPOINT_ARTIFACT_LIST_IDS: readonly string[] = [
  ENDPOINT_TRUSTED_APPS_LIST_ID,
  ENDPOINT_EVENT_FILTERS_LIST_ID,
  ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID,
];
