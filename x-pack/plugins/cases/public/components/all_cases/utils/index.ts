/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CUSTOM_FIELD_KEY_PREFIX } from '../constants';

export const isFlattenCustomField = (key: string): boolean =>
  key.startsWith(CUSTOM_FIELD_KEY_PREFIX);

export const flattenCustomFieldKey = (key: string): string => `${CUSTOM_FIELD_KEY_PREFIX}${key}`;

export const deflattenCustomFieldKey = (key: string): string =>
  key.replace(CUSTOM_FIELD_KEY_PREFIX, '');
