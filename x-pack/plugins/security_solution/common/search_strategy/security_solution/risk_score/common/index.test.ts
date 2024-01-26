/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getHostRiskIndex, getUserRiskIndex } from '.';

describe('hosts risk search_strategy getHostRiskIndex', () => {
  it('should properly return host index if space is specified', () => {
    expect(getHostRiskIndex('testName', true, false)).toEqual('ml_host_risk_score_latest_testName');
  });

  it('should properly return user index if space is specified', () => {
    expect(getUserRiskIndex('testName', true, false)).toEqual('ml_user_risk_score_latest_testName');
  });

  describe('with new risk score module installed', () => {
    it('should properly return host index if onlyLatest is false', () => {
      expect(getHostRiskIndex('default', false, true)).toEqual('risk-score.risk-score-default');
    });

    it('should properly return host index if onlyLatest is true', () => {
      expect(getHostRiskIndex('default', true, true)).toEqual(
        'risk-score.risk-score-latest-default'
      );
    });

    it('should properly return user index if onlyLatest is false', () => {
      expect(getUserRiskIndex('default', false, true)).toEqual('risk-score.risk-score-default');
    });

    it('should properly return user index if onlyLatest is true', () => {
      expect(getUserRiskIndex('default', true, true)).toEqual(
        'risk-score.risk-score-latest-default'
      );
    });
  });
});
