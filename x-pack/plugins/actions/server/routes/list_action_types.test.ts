/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { listActionTypesRoute } from './list_action_types';
import { httpServiceMock } from 'src/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { verifyApiAccess } from '../lib';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { LicenseType } from '../../../../plugins/licensing/server';

jest.mock('../lib/verify_api_access.ts', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('listActionTypesRoute', () => {
  it('lists action types with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    listActionTypesRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/actions/list_action_types"`);
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "tags": Array [
          "access:actions-read",
        ],
      }
    `);

    const listTypes = [
      {
        id: '1',
        name: 'name',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'gold' as LicenseType,
      },
    ];

    const [context, req, res] = mockHandlerArguments({ listTypes }, {}, ['ok']);

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Array [
          Object {
            "enabled": true,
            "enabledInConfig": true,
            "enabledInLicense": true,
            "id": "1",
            "minimumLicenseRequired": "gold",
            "name": "name",
          },
        ],
      }
    `);

    expect(context.actions!.listTypes).toHaveBeenCalledTimes(1);

    expect(res.ok).toHaveBeenCalledWith({
      body: listTypes,
    });
  });

  it('ensures the license allows listing action types', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    listActionTypesRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/actions/list_action_types"`);
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "tags": Array [
          "access:actions-read",
        ],
      }
    `);

    const listTypes = [
      {
        id: '1',
        name: 'name',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'gold' as LicenseType,
      },
    ];

    const [context, req, res] = mockHandlerArguments(
      { listTypes },
      {
        params: { id: '1' },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents listing action types', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    listActionTypesRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/actions/list_action_types"`);
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "tags": Array [
          "access:actions-read",
        ],
      }
    `);

    const listTypes = [
      {
        id: '1',
        name: 'name',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'gold' as LicenseType,
      },
    ];

    const [context, req, res] = mockHandlerArguments(
      { listTypes },
      {
        params: { id: '1' },
      },
      ['ok']
    );

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });
});
