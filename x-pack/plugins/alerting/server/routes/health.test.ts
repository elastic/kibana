/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { healthRoute } from './health';
import { mockRouter, RouterMock } from '../../../../../src/core/server/http/router/router.mock';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { elasticsearchServiceMock } from '../../../../../src/core/server/mocks';

beforeEach(() => {
  jest.resetAllMocks();
});

describe('healthRoute', () => {
  it('registers the route', async () => {
    const router: RouterMock = mockRouter.create();
    const es = elasticsearchServiceMock.createSetup();

    healthRoute(router, es);

    const [config] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alert/_health"`);
  });

  it('queries the usage api', async () => {
    const router: RouterMock = mockRouter.create();
    const es = elasticsearchServiceMock.createSetup();

    es.adminClient.callAsInternalUser.mockReturnValue(Promise.resolve({}));

    healthRoute(router, es);
    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments({}, {}, ['ok']);

    await handler(context, req, res);

    expect(es.adminClient.callAsInternalUser.mock.calls[0]).toMatchInlineSnapshot(`
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
    const es = elasticsearchServiceMock.createSetup();

    es.adminClient.callAsInternalUser.mockReturnValue(Promise.resolve({}));

    healthRoute(router, es);
    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments({}, {}, ['ok']);

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "canGenerateApiKeys": true,
        },
      }
    `);
  });

  it('evaluates missing security http info from the usage api to mean that the security plugin is disbled', async () => {
    const router: RouterMock = mockRouter.create();
    const es = elasticsearchServiceMock.createSetup();

    es.adminClient.callAsInternalUser.mockReturnValue(Promise.resolve({ security: {} }));

    healthRoute(router, es);
    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments({}, {}, ['ok']);

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "canGenerateApiKeys": true,
        },
      }
    `);
  });

  it('evaluates security enabled, and missing ssl info from the usage api to mean that the user cannot generate keys', async () => {
    const router: RouterMock = mockRouter.create();
    const es = elasticsearchServiceMock.createSetup();

    es.adminClient.callAsInternalUser.mockReturnValue(
      Promise.resolve({ security: { enabled: true } })
    );

    healthRoute(router, es);
    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments({}, {}, ['ok']);

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "canGenerateApiKeys": false,
        },
      }
    `);
  });

  it('evaluates security enabled, SSL info present but missing http info from the usage api to mean that the user cannot generate keys', async () => {
    const router: RouterMock = mockRouter.create();
    const es = elasticsearchServiceMock.createSetup();

    es.adminClient.callAsInternalUser.mockReturnValue(
      Promise.resolve({ security: { enabled: true, ssl: {} } })
    );

    healthRoute(router, es);
    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments({}, {}, ['ok']);

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "canGenerateApiKeys": false,
        },
      }
    `);
  });

  it('evaluates security and tls enabled to mean that the user can generate keys', async () => {
    const router: RouterMock = mockRouter.create();
    const es = elasticsearchServiceMock.createSetup();

    es.adminClient.callAsInternalUser.mockReturnValue(
      Promise.resolve({ security: { enabled: true, ssl: { http: { enabled: true } } } })
    );

    healthRoute(router, es);
    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments({}, {}, ['ok']);

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "canGenerateApiKeys": true,
        },
      }
    `);
  });
});
