/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INDICATOR_DESTINATION_PATH } from '../../../../../../../common/constants';

export const MATCHED_ATOMIC = 'matched.atomic';
export const MATCHED_FIELD = 'matched.field';
export const MATCHED_TYPE = 'matched.type';
export const threatMatchSubFields = [MATCHED_ATOMIC, MATCHED_FIELD, MATCHED_TYPE];

export const INDICATOR_MATCHED_ATOMIC = `${INDICATOR_DESTINATION_PATH}.${MATCHED_ATOMIC}`;
export const INDICATOR_MATCHED_FIELD = `${INDICATOR_DESTINATION_PATH}.${MATCHED_FIELD}`;
export const INDICATOR_MATCHED_TYPE = `${INDICATOR_DESTINATION_PATH}.${MATCHED_TYPE}`;

export const EVENT_DATASET = 'event.dataset';
export const EVENT_REFERENCE = 'event.reference';
export const PROVIDER = 'provider';

export const INDICATOR_DATASET = `${INDICATOR_DESTINATION_PATH}.${EVENT_DATASET}`;
export const INDICATOR_REFERENCE = `${INDICATOR_DESTINATION_PATH}.${EVENT_REFERENCE}`;
export const INDICATOR_PROVIDER = `${INDICATOR_DESTINATION_PATH}.${PROVIDER}`;

export const requiredFields = [
  INDICATOR_MATCHED_ATOMIC,
  INDICATOR_MATCHED_FIELD,
  INDICATOR_MATCHED_TYPE,
  INDICATOR_DATASET,
  INDICATOR_REFERENCE,
  INDICATOR_PROVIDER,
];
