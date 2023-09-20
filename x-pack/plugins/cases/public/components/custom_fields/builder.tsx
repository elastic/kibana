/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomFieldBuilderMap } from './types';
import { CustomFieldTypes } from '../../../common/types/domain';
import { configureTextCustomFieldBuilder } from './text/configure_text_field';
import { configureToggleCustomFieldBuilder } from './toggle/configure_toggle_field';

export const builderMap: CustomFieldBuilderMap = {
  [CustomFieldTypes.TEXT]: configureTextCustomFieldBuilder,
  [CustomFieldTypes.TOGGLE]: configureToggleCustomFieldBuilder,
};
