/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ComboBoxOption, RuntimeType } from './types';

export const RUNTIME_FIELD_OPTIONS: Array<ComboBoxOption<RuntimeType>> = [
  {
    label: 'Keyword',
    value: 'keyword',
  },
  {
    label: 'Long',
    value: 'long',
  },
  {
    label: 'Double',
    value: 'double',
  },
  {
    label: 'Date',
    value: 'date',
  },
  {
    label: 'IP',
    value: 'ip',
  },
  {
    label: 'Boolean',
    value: 'boolean',
  },
];
