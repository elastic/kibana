/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { healthRoute } from './health';
import { mockRouter, RouterMock } from '../../../../../src/core/server/http/router/router.mock';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { elasticsearchServiceMock } from '../../../../../src/core/server/mocks';
import { verifyApiAccess } from '../lib/license_api_access';
import { mockLicenseState } from '../lib/license_state.mock';

jest.mock('../lib/license_api_access.ts', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('healthRoute', () => {
  it('registers the route', async () => {
    const router: RouterMock = mockRouter.create();

    const licenseState = mockLicenseState();
    healthRoute(router, licenseState);

    const [config] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alert/_health"`);
  });

  it('queries the usage api', async () => {
    const router: RouterMock = mockRouter.create();

    const licenseState = mockLicenseState();
    healthRoute(router, licenseState);
    const [, handler] = router.get.mock.calls[0];

    const elasticsearch = elasticsearchServiceMock.createSetup();
    elasticsearch.adminClient.callAsInternalUser.mockReturnValue(Promise.resolve({}));

    const [context, req, res] = mockHandlerArguments({ elasticsearch }, {}, ['ok']);

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);

    expect(elasticsearch.adminClient.callAsInternalUser.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "transport.request",
        Object {
          "method": "GET",
          "path": "/_xpack/usage",
        },
      ]
    `);
  });

  it('evaluates missing security info from the usage api to mean that the security plugin is disbled', async () => {
    const router: RouterMock = mockRouter.create();

    const licenseState = mockLicenseState();
    healthRoute(router, licenseState);
    const [, handler] = router.get.mock.calls[0];

    const elasticsearch = elasticsearchServiceMock.createSetup();
    elasticsearch.adminClient.callAsInternalUser.mockReturnValue(Promise.resolve({}));

    const [context, req, res] = mockHandlerArguments({ elasticsearch }, {}, ['ok']);

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "isSufficientlySecure": true,
        },
      }
    `);
  });

  it('evaluates missing security http info from the usage api to mean that the security plugin is disbled', async () => {
    const router: RouterMock = mockRouter.create();

    const licenseState = mockLicenseState();
    healthRoute(router, licenseState);
    const [, handler] = router.get.mock.calls[0];

    const elasticsearch = elasticsearchServiceMock.createSetup();
    elasticsearch.adminClient.callAsInternalUser.mockReturnValue(Promise.resolve({ security: {} }));

    const [context, req, res] = mockHandlerArguments({ elasticsearch }, {}, ['ok']);

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "isSufficientlySecure": true,
        },
      }
    `);
  });

  it('evaluates security enabled, and missing ssl info from the usage api to mean that the user cannot generate keys', async () => {
    const router: RouterMock = mockRouter.create();

    const licenseState = mockLicenseState();
    healthRoute(router, licenseState);
    const [, handler] = router.get.mock.calls[0];

    const elasticsearch = elasticsearchServiceMock.createSetup();
    elasticsearch.adminClient.callAsInternalUser.mockReturnValue(
      Promise.resolve({ security: { enabled: true } })
    );

    const [context, req, res] = mockHandlerArguments({ elasticsearch }, {}, ['ok']);

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "isSufficientlySecure": false,
        },
      }
    `);
  });

  it('evaluates security enabled, SSL info present but missing http info from the usage api to mean that the user cannot generate keys', async () => {
    const router: RouterMock = mockRouter.create();

    const licenseState = mockLicenseState();
    healthRoute(router, licenseState);
    const [, handler] = router.get.mock.calls[0];

    const elasticsearch = elasticsearchServiceMock.createSetup();
    elasticsearch.adminClient.callAsInternalUser.mockReturnValue(
      Promise.resolve({ security: { enabled: true, ssl: {} } })
    );

    const [context, req, res] = mockHandlerArguments({ elasticsearch }, {}, ['ok']);

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "isSufficientlySecure": false,
        },
      }
    `);
  });

  it('evaluates security and tls enabled to mean that the user can generate keys', async () => {
    const router: RouterMock = mockRouter.create();

    const licenseState = mockLicenseState();
    healthRoute(router, licenseState);
    const [, handler] = router.get.mock.calls[0];

    const elasticsearch = elasticsearchServiceMock.createSetup();
    elasticsearch.adminClient.callAsInternalUser.mockReturnValue(
      Promise.resolve({ security: { enabled: true, ssl: { http: { enabled: true } } } })
    );

    const [context, req, res] = mockHandlerArguments({ elasticsearch }, {}, ['ok']);

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "isSufficientlySecure": true,
        },
      }
    `);
  });
});
