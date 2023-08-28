/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from './translations';
import { CustomFieldTypesUI } from '../type';

export type Options = {
  id: string;
  label: string;
}

export interface BasicOptions {
  required: Options
}

export interface TextOptions extends BasicOptions {
  characterLimit: Options
}

export const getConfig = (selectedType: CustomFieldTypesUI) => {
  let config: BasicOptions = {
    required: {
      id: 'required_option',
      label: i18n.REQUIRED,
  },
  }

  switch(selectedType) {
    case 'Text':
    case 'Textarea': 
      config = {
        ...config,
          characterLimit: {
          id: 'character_limit',
          label: i18n.CHARACTER_LIMIT,
        }
      } as TextOptions

      return  config;
    default :
      return config;
  }
}
