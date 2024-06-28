/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertingPublicPlugin, AlertingUIConfig } from './plugin';
import { coreMock } from '@kbn/core/public/mocks';
import {
  createManagementSectionMock,
  managementPluginMock,
} from '@kbn/management-plugin/public/mocks';

jest.mock('./services/rule_api', () => ({
  loadRule: jest.fn(),
  loadRuleType: jest.fn(),
}));

const mockAlertingUIConfig: AlertingUIConfig = {
  rules: {
    run: {
      alerts: {
        max: 1000,
      },
    },
  },
};

const mockInitializerContext = coreMock.createPluginInitializerContext(mockAlertingUIConfig);
const management = managementPluginMock.createSetupContract();
const mockSection = createManagementSectionMock();

describe('Alerting Public Plugin', () => {
  describe('start()', () => {
    it(`should fallback to the viewInAppRelativeUrl part of the rule object if navigation isn't registered`, async () => {
      const { loadRule, loadRuleType } = jest.requireMock('./services/rule_api');
      loadRule.mockResolvedValue({
        alertTypeId: 'foo',
        consumer: 'abc',
        viewInAppRelativeUrl: '/my/custom/path',
      });
      loadRuleType.mockResolvedValue({});

      mockSection.registerApp = jest.fn();
      management.sections.section.insightsAndAlerting = mockSection;

      const plugin = new AlertingPublicPlugin(mockInitializerContext);
      plugin.setup(coreMock.createSetup(), { management });
      const pluginStart = plugin.start(coreMock.createStart());

      const navigationPath = await pluginStart.getNavigation('123');
      expect(navigationPath).toEqual('/my/custom/path');
    });
  });
});
