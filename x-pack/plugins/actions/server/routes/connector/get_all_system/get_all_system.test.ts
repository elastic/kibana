/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAllConnectorsIncludingSystemRoute } from './get_all_system';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../lib/license_state.mock';
import { mockHandlerArguments } from '../../legacy/_mock_handler_arguments';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { actionsClientMock } from '../../../actions_client/actions_client.mock';

jest.mock('../../verify_access_and_context', () => ({
  verifyAccessAndContext: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
  (verifyAccessAndContext as jest.Mock).mockImplementation((license, handler) => handler);
});

describe('getAllConnectorsIncludingSystemRoute', () => {
  it('get all connectors with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getAllConnectorsIncludingSystemRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/actions/connectors"`);

    const actionsClient = actionsClientMock.create();
    actionsClient.getAll.mockResolvedValueOnce([
      {
        id: '.system-action-id',
        isPreconfigured: false,
        isSystemAction: true,
        isDeprecated: false,
        name: 'my system action',
        actionTypeId: '.system-action-type',
        isMissingSecrets: false,
        config: {},
        referencedByCount: 0,
      },
    ]);

    const [context, req, res] = mockHandlerArguments({ actionsClient }, {}, ['ok']);

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Array [
          Object {
            "config": Object {},
            "connector_type_id": ".system-action-type",
            "id": ".system-action-id",
            "is_deprecated": false,
            "is_missing_secrets": false,
            "is_preconfigured": false,
            "is_system_action": true,
            "name": "my system action",
            "referenced_by_count": 0,
          },
        ],
      }
    `);

    expect(actionsClient.getAll).toHaveBeenCalledWith({ includeSystemActions: true });

    expect(res.ok).toHaveBeenCalledWith({
      body: [
        {
          config: {},
          connector_type_id: '.system-action-type',
          id: '.system-action-id',
          is_deprecated: false,
          is_missing_secrets: false,
          is_preconfigured: false,
          is_system_action: true,
          name: 'my system action',
          referenced_by_count: 0,
        },
      ],
    });
  });

  it('ensures the license allows getting all connectors', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getAllConnectorsIncludingSystemRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/actions/connectors"`);

    const actionsClient = actionsClientMock.create();
    actionsClient.getAll.mockResolvedValueOnce([]);

    const [context, req, res] = mockHandlerArguments({ actionsClient }, {}, ['ok']);

    await handler(context, req, res);

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });

  it('ensures the license check prevents getting all connectors', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyAccessAndContext as jest.Mock).mockImplementation(() => async () => {
      throw new Error('OMG');
    });

    getAllConnectorsIncludingSystemRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/actions/connectors"`);

    const actionsClient = actionsClientMock.create();
    actionsClient.getAll.mockResolvedValueOnce([]);

    const [context, req, res] = mockHandlerArguments({ actionsClient }, {}, ['ok']);

    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });
});
