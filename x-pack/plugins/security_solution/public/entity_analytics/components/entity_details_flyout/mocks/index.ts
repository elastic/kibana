/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import type { AlertRawData } from '../tabs/risk_inputs/risk_inputs_tab';

export const alertDataMock: AlertRawData = {
  _id: 'test-id',
  _index: 'test-index',
  fields: {
    [ALERT_RULE_UUID]: ['2e051244-b3c6-4779-a241-e1b4f0beceb9'],
    '@timestamp': ['2023-07-20T20:31:24.896Z'],
    [ALERT_RULE_NAME]: ['Rule Name'],
  },
};
