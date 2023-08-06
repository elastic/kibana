/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesFieldMap } from '../8.0.0';

export const rulesFieldMap810 = {
  ...rulesFieldMap,
  'kibana.alert.rule.custom_highlighted_fields': {
    type: 'keyword',
    array: true,
    required: false,
  },
} as const;

export type RulesFieldMap810 = typeof rulesFieldMap810;
