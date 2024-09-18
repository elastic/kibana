/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { LicenseType } from '@kbn/licensing-plugin/server';
import { licenseStateMock } from '../../../lib/license_state.mock';
import { mockHandlerArguments } from '../../legacy/_mock_handler_arguments';
import { listTypesWithSystemRoute } from './list_types_system';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { actionsClientMock } from '../../../mocks';

jest.mock('../../verify_access_and_context', () => ({
  verifyAccessAndContext: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
  (verifyAccessAndContext as jest.Mock).mockImplementation((license, handler) => handler);
});

describe('listTypesWithSystemRoute', () => {
  it('lists action types with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    listTypesWithSystemRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/actions/connector_types"`);

    const listTypes = [
      {
        id: '1',
        name: 'name',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'gold' as LicenseType,
        supportedFeatureIds: ['alerting'],
        isSystemActionType: true,
      },
    ];

    const actionsClient = actionsClientMock.create();
    actionsClient.listTypes.mockResolvedValueOnce(listTypes);
    const [context, req, res] = mockHandlerArguments({ actionsClient }, {}, ['ok']);

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Array [
          Object {
            "enabled": true,
            "enabled_in_config": true,
            "enabled_in_license": true,
            "id": "1",
            "is_system_action_type": true,
            "minimum_license_required": "gold",
            "name": "name",
            "supported_feature_ids": Array [
              "alerting",
            ],
          },
        ],
      }
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: [
        {
          id: '1',
          name: 'name',
          enabled: true,
          enabled_in_config: true,
          enabled_in_license: true,
          supported_feature_ids: ['alerting'],
          minimum_license_required: 'gold',
          is_system_action_type: true,
        },
      ],
    });
  });

  it('passes feature_id if provided as query parameter', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    listTypesWithSystemRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/actions/connector_types"`);

    const listTypes = [
      {
        id: '1',
        name: 'name',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        supportedFeatureIds: ['alerting'],
        minimumLicenseRequired: 'gold' as LicenseType,
        isSystemActionType: false,
      },
    ];

    const actionsClient = actionsClientMock.create();
    actionsClient.listTypes.mockResolvedValueOnce(listTypes);
    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        query: {
          feature_id: 'alerting',
        },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Array [
          Object {
            "enabled": true,
            "enabled_in_config": true,
            "enabled_in_license": true,
            "id": "1",
            "is_system_action_type": false,
            "minimum_license_required": "gold",
            "name": "name",
            "supported_feature_ids": Array [
              "alerting",
            ],
          },
        ],
      }
    `);

    expect(actionsClient.listTypes).toHaveBeenCalledTimes(1);
    expect(actionsClient.listTypes.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "featureId": "alerting",
          "includeSystemActionTypes": true,
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: [
        {
          id: '1',
          name: 'name',
          enabled: true,
          enabled_in_config: true,
          enabled_in_license: true,
          supported_feature_ids: ['alerting'],
          minimum_license_required: 'gold',
          is_system_action_type: false,
        },
      ],
    });
  });

  it('ensures the license allows listing action types', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    listTypesWithSystemRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/actions/connector_types"`);

    const listTypes = [
      {
        id: '1',
        name: 'name',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        supportedFeatureIds: ['alerting'],
        minimumLicenseRequired: 'gold' as LicenseType,
        isSystemActionType: false,
      },
    ];

    const actionsClient = actionsClientMock.create();
    actionsClient.listTypes.mockResolvedValueOnce(listTypes);

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        params: { id: '1' },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });

  it('ensures the license check prevents listing action types', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyAccessAndContext as jest.Mock).mockImplementation(() => async () => {
      throw new Error('OMG');
    });

    listTypesWithSystemRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/actions/connector_types"`);

    const listTypes = [
      {
        id: '1',
        name: 'name',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        supportedFeatureIds: ['alerting'],
        minimumLicenseRequired: 'gold' as LicenseType,
        isSystemActionType: false,
      },
    ];

    const actionsClient = actionsClientMock.create();
    actionsClient.listTypes.mockResolvedValueOnce(listTypes);

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        params: { id: '1' },
      },
      ['ok']
    );

    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });
});
