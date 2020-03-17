/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { healthRoute, elasticsearchClientPlugin } from './health';
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

  it('uses a custom Elasticsearch client with a custom security api plugin', async () => {
    const router: RouterMock = mockRouter.create();
    const es = elasticsearchServiceMock.createSetup();

    const alertingSecurityClient = elasticsearchServiceMock.createCustomClusterClient();
    es.createClient.mockReturnValue(alertingSecurityClient);

    const scopedClient = elasticsearchServiceMock.createScopedClusterClient();
    alertingSecurityClient.asScoped.mockReturnValue(scopedClient);

    scopedClient.callAsCurrentUser.mockReturnValue(Promise.resolve({}));

    healthRoute(router, es);

    expect(es.createClient).toHaveBeenCalledWith('alertingSecurity', {
      plugins: [elasticsearchClientPlugin],
    });

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments({}, {}, ['ok']);

    await handler(context, req, res);

    expect(alertingSecurityClient.asScoped).toHaveBeenCalledWith(req);
    expect(
      scopedClient.callAsCurrentUser
    ).toHaveBeenCalledWith('alertingSecurity.canGenerateApiKeys', { owner: true });
  });

  it('evaluates truthy values from the security api_key api to mean that the user can generate Api Keys', async () => {
    const router: RouterMock = mockRouter.create();
    const es = elasticsearchServiceMock.createSetup();

    const alertingSecurityClient = elasticsearchServiceMock.createCustomClusterClient();
    es.createClient.mockReturnValue(alertingSecurityClient);

    const scopedClient = elasticsearchServiceMock.createScopedClusterClient();
    alertingSecurityClient.asScoped.mockReturnValue(scopedClient);

    scopedClient.callAsCurrentUser.mockReturnValue(Promise.resolve({}));

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

  it('evaluates falsey values from the security api_key api to mean that the user can generate Api Keys', async () => {
    const router: RouterMock = mockRouter.create();
    const es = elasticsearchServiceMock.createSetup();

    const alertingSecurityClient = elasticsearchServiceMock.createCustomClusterClient();
    es.createClient.mockReturnValue(alertingSecurityClient);

    const scopedClient = elasticsearchServiceMock.createScopedClusterClient();
    alertingSecurityClient.asScoped.mockReturnValue(scopedClient);

    scopedClient.callAsCurrentUser.mockReturnValue(Promise.resolve(undefined));

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

    expect(res.ok).toHaveBeenCalled();
  });

  it('evaluates disabled api_keys in the security api as meaning the user cannot create Api Keys', async () => {
    const router: RouterMock = mockRouter.create();
    const es = elasticsearchServiceMock.createSetup();

    const alertingSecurityClient = elasticsearchServiceMock.createCustomClusterClient();
    es.createClient.mockReturnValue(alertingSecurityClient);

    const scopedClient = elasticsearchServiceMock.createScopedClusterClient();
    alertingSecurityClient.asScoped.mockReturnValue(scopedClient);

    scopedClient.callAsCurrentUser.mockReturnValue(
      Promise.reject(new Error('Error: api keys are not enabled'))
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

    expect(res.ok).toHaveBeenCalled();
  });

  it('evaluates errors from the api_keys security api complaining about no handler as meaning security is disabled', async () => {
    const router: RouterMock = mockRouter.create();
    const es = elasticsearchServiceMock.createSetup();

    const alertingSecurityClient = elasticsearchServiceMock.createCustomClusterClient();
    es.createClient.mockReturnValue(alertingSecurityClient);

    const scopedClient = elasticsearchServiceMock.createScopedClusterClient();
    alertingSecurityClient.asScoped.mockReturnValue(scopedClient);

    scopedClient.callAsCurrentUser.mockReturnValue(
      Promise.reject(
        new Error(
          'Error: no handler found for uri [/_security/api_key?owner=true] and method [GET]'
        )
      )
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

    expect(res.ok).toHaveBeenCalled();
  });

  it('evaluates any other errors from the api_keys security api as an unhealthy alerting service state', async () => {
    const router: RouterMock = mockRouter.create();
    const es = elasticsearchServiceMock.createSetup();

    const alertingSecurityClient = elasticsearchServiceMock.createCustomClusterClient();
    es.createClient.mockReturnValue(alertingSecurityClient);

    const scopedClient = elasticsearchServiceMock.createScopedClusterClient();
    alertingSecurityClient.asScoped.mockReturnValue(scopedClient);

    scopedClient.callAsCurrentUser.mockReturnValue(
      Promise.reject(new Error('Error: there are monkeys in the index, send HALP!'))
    );

    healthRoute(router, es);
    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments({}, {}, ['badRequest']);

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": [Error: Error: there are monkeys in the index, send HALP!],
      }
    `);

    expect(res.badRequest).toHaveBeenCalled();
  });
});
