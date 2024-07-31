/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EVALUATION_THRESHOLD, ALERT_EVALUATION_VALUE } from '@kbn/rule-data-utils';
import { alertWithGroupsAndTags } from './alert';
import type { AlertSummaryField } from '../components/alert_summary';

export const alertSummaryFieldsMock: AlertSummaryField[] = [
  {
    label: 'Actual value',
    value: alertWithGroupsAndTags.fields[ALERT_EVALUATION_VALUE]!,
  },
  {
    label: 'Expected value',
    value: alertWithGroupsAndTags.fields[ALERT_EVALUATION_THRESHOLD]!,
  },
];
