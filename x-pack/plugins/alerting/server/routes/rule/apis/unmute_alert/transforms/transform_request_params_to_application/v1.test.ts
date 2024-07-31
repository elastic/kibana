/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformRequestParamsToApplication } from '..';

describe('transformRequestParamsToApplication', () => {
  it('changes the parameters case', () => {
    const transformed = transformRequestParamsToApplication({
      rule_id: 'test-rule-id',
      alert_id: 'test-alert-id',
    });
    expect(transformed).toEqual({ alertId: 'test-rule-id', alertInstanceId: 'test-alert-id' });
  });
});
