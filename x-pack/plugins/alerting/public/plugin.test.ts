/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertingPublicPlugin } from './plugin';
import { coreMock } from '@kbn/core/public/mocks';

jest.mock('./alert_api', () => ({
  loadRule: jest.fn(),
  loadRuleType: jest.fn(),
}));

describe('Alerting Public Plugin', () => {
  describe('start()', () => {
    it(`should fallback to the viewInAppRelativeUrl part of the rule object if navigation isn't registered`, async () => {
      const { loadRule, loadRuleType } = jest.requireMock('./alert_api');
      loadRule.mockResolvedValue({
        alertTypeId: 'foo',
        consumer: 'abc',
        viewInAppRelativeUrl: '/my/custom/path',
      });
      loadRuleType.mockResolvedValue({});

      const plugin = new AlertingPublicPlugin();
      plugin.setup();
      const pluginStart = plugin.start(coreMock.createStart());

      const navigationPath = await pluginStart.getNavigation('123');
      expect(navigationPath).toEqual('/my/custom/path');
    });
  });
});
