/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from '../translations';
import type { CustomFieldTypesUI } from '../types';

export interface Options {
  id: string;
  label: string;
}

export interface BasicOptions {
  required: Options;
}

export interface ListOptions extends BasicOptions {
  multipleSelections: Options;
}

export const getConfig = (selectedType: CustomFieldTypesUI) => {
  let config: BasicOptions = {
    required: {
      id: 'required_option',
      label: i18n.FIELD_OPTION_REQUIRED,
    },
  };

  switch (selectedType) {
    case 'List':
      config = {
        ...config,
        multipleSelections: {
          id: 'multiple_selections',
          label: i18n.MULTIPLE_SELECTIONS,
        },
      } as ListOptions;

      return config;
    default:
      return config;
  }
};
