/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getHostRiskIndex } from '.';

describe('hosts risk search_strategy getHostRiskIndex', () => {
  it('should properly return index if space is specified', () => {
    expect(getHostRiskIndex('testName')).toEqual('ml_host_risk_score_latest_testName');
  });
});
