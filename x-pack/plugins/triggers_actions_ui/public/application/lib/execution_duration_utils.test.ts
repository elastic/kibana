/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatMillisForDisplay, shouldShowDurationWarning } from './execution_duration_utils';
import { RuleType } from '../../types';

describe('execution duration', () => {
  describe('formatMillisForDisplay', () => {
    it('should return 0 for undefined', () => {
      expect(formatMillisForDisplay(undefined)).toEqual('00:00:00.000');
    });

    it('should correctly format millisecond duration in milliseconds', () => {
      expect(formatMillisForDisplay(845)).toEqual('00:00:00.845');
    });

    it('should correctly format second duration in milliseconds', () => {
      expect(formatMillisForDisplay(45200)).toEqual('00:00:45.200');
    });

    it('should correctly format minute duration in milliseconds', () => {
      expect(formatMillisForDisplay(122450)).toEqual('00:02:02.450');
    });

    it('should correctly format hour duration in milliseconds', () => {
      expect(formatMillisForDisplay(3634601)).toEqual('01:00:34.601');
    });
  });

  describe('shouldShowDurationWarning', () => {
    it('should return false if rule type or config or config.timeout is undefined', () => {
      expect(shouldShowDurationWarning(undefined, 1000)).toEqual(false);
      expect(shouldShowDurationWarning(mockRuleType(), 1000)).toEqual(false);
      expect(
        shouldShowDurationWarning(
          { ...mockRuleType(), config: { execution: { actions: { max: 1000 } } } } as RuleType,
          1000
        )
      ).toEqual(false);
    });

    it('should return false if average duration is less than rule task timeout', () => {
      expect(
        shouldShowDurationWarning(
          mockRuleType({ config: { execution: { timeout: '1m', actions: { max: 1000 } } } }),
          1000
        )
      ).toEqual(false);
    });

    it('should return true if average duration is greater than rule task timeout', () => {
      expect(
        shouldShowDurationWarning(
          mockRuleType({ config: { execution: { timeout: '1m', actions: { max: 1000 } } } }),
          120000
        )
      ).toEqual(true);
    });
  });
});

function mockRuleType(overwrites: Partial<RuleType> = {}): RuleType {
  return {
    id: 'test.testRuleType',
    name: 'My Test Rule Type',
    actionGroups: [{ id: 'default', name: 'Default Action Group' }],
    actionVariables: {
      context: [],
      state: [],
      params: [],
    },
    defaultActionGroupId: 'default',
    recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
    authorizedConsumers: {},
    producer: 'alerts',
    minimumLicenseRequired: 'basic',
    enabledInLicense: true,
    ...overwrites,
  };
}
