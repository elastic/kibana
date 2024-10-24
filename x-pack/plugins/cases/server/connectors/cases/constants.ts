/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomFieldTypes } from '../../../common/types/domain';

export const MAX_CONCURRENT_ES_REQUEST = 5;
export const MAX_OPEN_CASES = 10;
export const DEFAULT_MAX_OPEN_CASES = 5;
export const INITIAL_ORACLE_RECORD_COUNTER = 1;

export const VALUES_FOR_CUSTOM_FIELDS_MISSING_DEFAULTS: Record<
  CustomFieldTypes,
  string | boolean | number
> = {
  [CustomFieldTypes.TEXT]: 'N/A',
  [CustomFieldTypes.TOGGLE]: false,
  [CustomFieldTypes.NUMBER]: 0,
};
