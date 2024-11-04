/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ComboBoxOption } from './types';

export const RUNTIME_FIELD_TYPES = ['keyword', 'long', 'double', 'date', 'ip', 'boolean'] as const;

type RuntimeType = (typeof RUNTIME_FIELD_TYPES)[number];

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
