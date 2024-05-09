/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { rulesClientMock } from '@kbn/alerting-plugin/server/rules_client.mock';
import { createConfigRoute } from './config';
import { RecoveredActionGroup } from '@kbn/alerting-plugin/common';
import { RegistryAlertTypeWithAuth } from '@kbn/alerting-plugin/server/authorization';

const ruleTypes = [
  {
    id: '1',
    name: 'name',
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    ruleTaskTimeout: '10m',
    recoveryActionGroup: RecoveredActionGroup,
    authorizedConsumers: {},
    actionVariables: {
      context: [],
      state: [],
    },
    category: 'test',
    producer: 'test',
    enabledInLicense: true,
    minimumScheduleInterval: '1m',
    defaultScheduleInterval: '10m',
  } as unknown as RegistryAlertTypeWithAuth,
];

describe('createConfigRoute', () => {
  it('registers the route and returns exposed config values if user is authorized', async () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.create().get();
    const mockRulesClient = rulesClientMock.create();

    mockRulesClient.listRuleTypes.mockResolvedValueOnce(new Set(ruleTypes));
    createConfigRoute({
      logger,
      router,
      baseRoute: `/internal/triggers_actions_ui`,
      alertingConfig: () => ({
        isUsingSecurity: true,
        maxScheduledPerMinute: 10000,
        minimumScheduleInterval: { value: '1m', enforce: false },
        run: { alerts: { max: 1000 }, actions: { max: 100000 } },
      }),
      getRulesClientWithRequest: async () => mockRulesClient,
    });

    const [config, handler] = router.get.mock.calls[0];
    expect(config.path).toMatchInlineSnapshot(`"/internal/triggers_actions_ui/_config"`);

    const mockResponse = httpServerMock.createResponseFactory();
    await handler({}, httpServerMock.createKibanaRequest(), mockResponse);

    expect(mockResponse.ok).toBeCalled();
    expect(mockResponse.ok.mock.calls[0][0]).toEqual({
      body: {
        isUsingSecurity: true,
        maxScheduledPerMinute: 10000,
        minimumScheduleInterval: { value: '1m', enforce: false },
      },
    });
  });

  it('registers the route and returns forbidden error if user does not have access to any alerting rules ', async () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.create().get();
    const mockRulesClient = rulesClientMock.create();

    mockRulesClient.listRuleTypes.mockResolvedValueOnce(new Set());
    createConfigRoute({
      logger,
      router,
      baseRoute: `/internal/triggers_actions_ui`,
      alertingConfig: () => ({
        isUsingSecurity: true,
        maxScheduledPerMinute: 10000,
        minimumScheduleInterval: { value: '1m', enforce: false },
        run: { alerts: { max: 1000 }, actions: { max: 100000 } },
      }),
      getRulesClientWithRequest: async () => mockRulesClient,
    });

    const [config, handler] = router.get.mock.calls[0];
    expect(config.path).toMatchInlineSnapshot(`"/internal/triggers_actions_ui/_config"`);

    const mockResponse = httpServerMock.createResponseFactory();
    await handler({}, httpServerMock.createKibanaRequest(), mockResponse);

    expect(mockResponse.forbidden).toBeCalled();
    expect(mockResponse.forbidden.mock.calls[0][0]).toEqual({
      body: { message: 'Unauthorized to access config' },
    });
  });
});
