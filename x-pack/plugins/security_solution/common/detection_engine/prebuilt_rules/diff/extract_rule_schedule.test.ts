/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRulesSchemaMock } from '../../../api/detection_engine/model/rule_schema/mocks';
import { extractRuleSchedule } from './extract_rule_schedule';

describe('extractRuleSchedule', () => {
  it('normalizes lookback strings to seconds', () => {
    const mockRule = { ...getRulesSchemaMock(), from: 'now-6m', interval: '5m', to: 'now' };
    const normalizedRuleSchedule = extractRuleSchedule(mockRule);

    expect(normalizedRuleSchedule).toEqual({ interval: '5m', lookback: '60s' });
  });
});
