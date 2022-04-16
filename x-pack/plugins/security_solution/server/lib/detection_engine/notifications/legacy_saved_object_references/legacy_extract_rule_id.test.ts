/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
// eslint-disable-next-line no-restricted-imports
import { LegacyRulesNotificationParams } from '../legacy_types';
// eslint-disable-next-line no-restricted-imports
import { legacyExtractRuleId } from './legacy_extract_rule_id';

describe('legacy_extract_rule_id', () => {
  type FuncReturn = ReturnType<typeof legacyExtractRuleId>;
  let logger = loggingSystemMock.create().get('security_solution');

  beforeEach(() => {
    logger = loggingSystemMock.create().get('security_solution');
  });

  test('it returns an empty array given a "undefined" ruleAlertId.', () => {
    expect(
      legacyExtractRuleId({
        logger,
        ruleAlertId: undefined as unknown as LegacyRulesNotificationParams['ruleAlertId'],
      })
    ).toEqual<FuncReturn>([]);
  });

  test('logs expect error message if given a "undefined" ruleAlertId.', () => {
    expect(
      legacyExtractRuleId({
        logger,
        ruleAlertId: null as unknown as LegacyRulesNotificationParams['ruleAlertId'],
      })
    ).toEqual<FuncReturn>([]);

    expect(logger.error).toBeCalledWith(
      'Security Solution notification (Legacy) system "ruleAlertId" is null or undefined when it never should be. This indicates potentially that saved object migrations did not run correctly. Returning empty reference.'
    );
  });

  test('it returns the "ruleAlertId" transformed into a saved object references array.', () => {
    expect(
      legacyExtractRuleId({
        logger,
        ruleAlertId: '123',
      })
    ).toEqual<FuncReturn>([
      {
        id: '123',
        name: 'alert_0',
        type: 'alert',
      },
    ]);
  });
});
