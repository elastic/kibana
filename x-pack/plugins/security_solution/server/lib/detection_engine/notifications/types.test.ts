/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNotificationResult, getAlertMock } from '../routes/__mocks__/request_responses';
import { isAlertTypes } from './types';
import { getQueryRuleParams } from '../schemas/rule_schemas.mock';

describe('types', () => {
  it('isAlertTypes should return true if is RuleNotificationAlertType type', () => {
    expect(isAlertTypes([getNotificationResult()])).toEqual(true);
  });

  it('isAlertTypes should return false if is not RuleNotificationAlertType', () => {
    expect(isAlertTypes([getAlertMock(getQueryRuleParams())])).toEqual(false);
  });
});
