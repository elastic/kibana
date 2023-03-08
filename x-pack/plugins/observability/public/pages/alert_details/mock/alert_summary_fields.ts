/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertSummaryField } from '../types';
import { alertWithTags } from './alert';
export const alertSummaryFieldsMock: AlertSummaryField[] = [
  {
    label: 'Actual value',
    value: alertWithTags.fields['kibana.alert.evaluation.value']!,
  },
  {
    label: 'Expected value',
    value: alertWithTags.fields['kibana.alert.evaluation.threshold']!,
  },
  {
    label: 'Source',
    value: '-',
  },
];
