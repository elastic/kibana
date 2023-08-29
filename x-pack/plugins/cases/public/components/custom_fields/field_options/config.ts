/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from './translations';
import type { CustomFieldTypesUI } from '../type';

export interface Options {
  id: string;
  label: string;
}

export interface BasicOptions {
  required: Options;
}

export interface TextOptions extends BasicOptions {
  characterLimit: Options;
}

export interface ListOptions extends BasicOptions {
  multipleSelections: Options;
  customValues: Options;
}

export const getConfig = (selectedType: CustomFieldTypesUI) => {
  let config: BasicOptions = {
    required: {
      id: 'required_option',
      label: i18n.REQUIRED,
    },
  };

  switch (selectedType) {
    case 'Text':
    case 'Textarea':
      config = {
        ...config,
        characterLimit: {
          id: 'character_limit',
          label: i18n.CHARACTER_LIMIT,
        },
      } as TextOptions;

      return config;

    case 'List':
      config = {
        ...config,
        multipleSelections: {
          id: 'multiple_selections',
          label: i18n.MULTIPLE_SELECTIONS,
        },
        customValues: {
          id: 'custom_values',
          label: i18n.CUSTOM_VALUES,
        },
      } as ListOptions;

      return config;
    default:
      return config;
  }
};
