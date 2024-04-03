/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { RiskCategories } from '../../../../../common/entity_analytics/risk_engine';
import type { InputAlert } from '../../../hooks/use_risk_contributing_alerts';

export const alertInputDataMock: InputAlert = {
  input: {
    id: 'test-id',
    index: 'test-index',
    category: RiskCategories.category_1,
    description: 'test-description',
    timestamp: '2023-07-20T20:31:24.896Z',
    risk_score: 50,
    contribution_score: 20,
  },
  alert: {
    [ALERT_RULE_UUID]: '2e051244-b3c6-4779-a241-e1b4f0beceb9',
    [ALERT_RULE_NAME]: 'Rule Name',
  },
};
