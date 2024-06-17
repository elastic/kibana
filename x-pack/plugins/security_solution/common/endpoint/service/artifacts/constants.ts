/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINT_ARTIFACT_LIST_IDS } from '@kbn/securitysolution-list-constants';

export const BY_POLICY_ARTIFACT_TAG_PREFIX = 'policy:';

export const GLOBAL_ARTIFACT_TAG = `${BY_POLICY_ARTIFACT_TAG_PREFIX}all`;

export const FILTER_PROCESS_DESCENDANTS_TAG = 'filter_process_descendants';

// TODO: refact all uses of `ALL_ENDPOINT_ARTIFACTS_LIST_IDS to sue new const from shared package
export const ALL_ENDPOINT_ARTIFACT_LIST_IDS = ENDPOINT_ARTIFACT_LIST_IDS;

export const DEFAULT_EXCEPTION_LIST_ITEM_SEARCHABLE_FIELDS: Readonly<string[]> = [
  `name`,
  `description`,
  `entries.value`,
  `entries.entries.value`,
  `item_id`,
];
