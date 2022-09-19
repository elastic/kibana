/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { StackConnectorsPlugin } from './plugin';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';

describe('Stack Connectors Plugin', () => {
  describe('setup()', () => {
    let context: PluginInitializerContext;
    let plugin: StackConnectorsPlugin;
    let coreSetup: ReturnType<typeof coreMock.createSetup>;

    beforeEach(() => {
      context = coreMock.createPluginInitializerContext();
      plugin = new StackConnectorsPlugin(context);
      coreSetup = coreMock.createSetup();
    });

    it('should register built in connector types', () => {
      const actionsSetup = actionsMock.createSetup();
      plugin.setup(coreSetup, { actions: actionsSetup });
      expect(actionsSetup.registerType).toHaveBeenCalledTimes(15);
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          id: '.email',
          name: 'Email',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          id: '.index',
          name: 'Index',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          id: '.pagerduty',
          name: 'PagerDuty',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({
          id: '.swimlane',
          name: 'Swimlane',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        5,
        expect.objectContaining({
          id: '.server-log',
          name: 'Server log',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        6,
        expect.objectContaining({
          id: '.slack',
          name: 'Slack',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        7,
        expect.objectContaining({
          id: '.webhook',
          name: 'Webhook',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        8,
        expect.objectContaining({
          id: '.cases-webhook',
          name: 'Webhook - Case Management',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        9,
        expect.objectContaining({
          id: '.xmatters',
          name: 'xMatters',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        10,
        expect.objectContaining({
          id: '.servicenow',
          name: 'ServiceNow ITSM',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        11,
        expect.objectContaining({
          id: '.servicenow-sir',
          name: 'ServiceNow SecOps',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        12,
        expect.objectContaining({
          id: '.servicenow-itom',
          name: 'ServiceNow ITOM',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        13,
        expect.objectContaining({
          id: '.jira',
          name: 'Jira',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        14,
        expect.objectContaining({
          id: '.resilient',
          name: 'IBM Resilient',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        15,
        expect.objectContaining({
          id: '.teams',
          name: 'Microsoft Teams',
        })
      );
    });
  });
});
