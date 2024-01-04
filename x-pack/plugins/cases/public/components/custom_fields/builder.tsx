/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomFieldBuilderMap } from './types';
import { CustomFieldTypes } from '../../../common/types/domain';
import { configureTextCustomFieldFactory } from './text/configure_text_field';
import { configureToggleCustomFieldFactory } from './toggle/configure_toggle_field';

export const builderMap = Object.freeze({
  [CustomFieldTypes.TEXT]: configureTextCustomFieldFactory,
  [CustomFieldTypes.TOGGLE]: configureToggleCustomFieldFactory,
} as const) as CustomFieldBuilderMap;
