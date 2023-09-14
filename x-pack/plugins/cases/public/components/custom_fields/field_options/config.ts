/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from '../translations';
import type { CustomFieldTypes } from '../types';

export interface Options {
  id: string;
  label: string;
}

export interface BasicOptions {
  required: Options;
}

export const getConfig = (selectedType: CustomFieldTypes) => {
  const config: BasicOptions = {
    required: {
      id: 'required',
      label: i18n.FIELD_OPTION_REQUIRED,
    },
  };

  return config;
};
