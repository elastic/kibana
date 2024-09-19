/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('jsonwebtoken', () => ({
  sign: () => {
    return 'json-web-token';
  },
}));

import {
  httpServiceMock,
  httpServerMock,
  coreMock,
  securityServiceMock,
  coreFeatureFlagsMock,
} from '@kbn/core/server/mocks';
import { kibanaResponseFactory } from '@kbn/core/server';
import { type MetaWithSaml, registerChatRoute } from './chat';

describe('chat route', () => {
  let security: ReturnType<typeof securityServiceMock.createRequestHandlerContext>;
  let requestHandlerContextMock: ReturnType<typeof coreMock.createCustomRequestHandlerContext>;
  let featureFlags: ReturnType<typeof coreFeatureFlagsMock.createRequestHandlerContext>;

  beforeEach(() => {
    const core = coreMock.createRequestHandlerContext();
    security = core.security;
    featureFlags = core.featureFlags;
    featureFlags.getStringValue.mockResolvedValue('header');
    featureFlags.getBooleanValue.mockResolvedValue(true);
    requestHandlerContextMock = coreMock.createCustomRequestHandlerContext({ core });
  });

  test('error if no user', async () => {
    security.authc.getCurrentUser.mockReturnValueOnce(null);

    const router = httpServiceMock.createRouter();
    registerChatRoute({
      router,
      isDev: false,
      chatIdentitySecret: 'secret',
      trialBuffer: 60,
      trialEndDate: new Date(),
    });

    const [_config, handler] = router.get.mock.calls[0];

    await expect(
      handler(
        requestHandlerContextMock,
        httpServerMock.createKibanaRequest(),
        kibanaResponseFactory
      )
    ).resolves.toMatchInlineSnapshot(`
      KibanaResponse {
        "options": Object {},
        "payload": "Not Found",
        "status": 404,
      }
    `);
  });

  test('error if no user is missing any details', async () => {
    security.authc.getCurrentUser.mockReturnValueOnce(
      securityServiceMock.createMockAuthenticatedUser({
        username: undefined,
      })
    );

    const router = httpServiceMock.createRouter();
    registerChatRoute({
      router,
      isDev: false,
      chatIdentitySecret: 'secret',
      trialBuffer: 60,
      trialEndDate: new Date(),
    });

    const [_config, handler] = router.get.mock.calls[0];

    await expect(
      handler(
        requestHandlerContextMock,
        httpServerMock.createKibanaRequest(),
        kibanaResponseFactory
      )
    ).resolves.toMatchInlineSnapshot(`
      KibanaResponse {
        "options": Object {
          "body": "User has no email or username",
        },
        "payload": "User has no email or username",
        "status": 400,
      }
    `);
  });

  test('error if no trial end date specified', async () => {
    const username = 'user.name';
    const email = 'user@elastic.co';

    security.authc.getCurrentUser.mockReturnValueOnce(
      securityServiceMock.createMockAuthenticatedUser({
        username,
        metadata: {
          saml_email: [email],
        } as MetaWithSaml,
      })
    );

    const router = httpServiceMock.createRouter();
    registerChatRoute({
      router,
      isDev: false,
      chatIdentitySecret: 'secret',
      trialBuffer: 2,
    });

    const [_config, handler] = router.get.mock.calls[0];

    await expect(
      handler(
        requestHandlerContextMock,
        httpServerMock.createKibanaRequest(),
        kibanaResponseFactory
      )
    ).resolves.toMatchInlineSnapshot(`
        KibanaResponse {
          "options": Object {
            "body": "Chat can only be started if a trial end date is specified",
          },
          "payload": "Chat can only be started if a trial end date is specified",
          "status": 400,
        }
      `);
  });

  test('error if not in trial window', async () => {
    const username = 'user.name';
    const email = 'user@elastic.co';

    security.authc.getCurrentUser.mockReturnValueOnce(
      securityServiceMock.createMockAuthenticatedUser({
        username,
        metadata: {
          saml_email: [email],
        } as MetaWithSaml,
      })
    );

    const router = httpServiceMock.createRouter();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() - 30);
    registerChatRoute({
      router,
      isDev: false,
      chatIdentitySecret: 'secret',
      trialBuffer: 2,
      trialEndDate,
    });

    const [_config, handler] = router.get.mock.calls[0];

    await expect(
      handler(
        requestHandlerContextMock,
        httpServerMock.createKibanaRequest(),
        kibanaResponseFactory
      )
    ).resolves.toMatchInlineSnapshot(`
        KibanaResponse {
          "options": Object {
            "body": "Chat can only be started during trial and trial chat buffer",
          },
          "payload": "Chat can only be started during trial and trial chat buffer",
          "status": 400,
        }
      `);
  });

  test('error if disabled in experiments', async () => {
    const username = 'user.name';
    const email = 'user@elastic.co';

    security.authc.getCurrentUser.mockReturnValueOnce(
      securityServiceMock.createMockAuthenticatedUser({
        username,
        metadata: {
          saml_email: [email],
        } as MetaWithSaml,
      })
    );

    const router = httpServiceMock.createRouter();
    featureFlags.getBooleanValue.mockResolvedValueOnce(false);
    registerChatRoute({
      router,
      isDev: false,
      chatIdentitySecret: 'secret',
      trialBuffer: 60,
      trialEndDate: new Date(),
    });
    const [_config, handler] = router.get.mock.calls[0];
    await expect(
      handler(
        requestHandlerContextMock,
        httpServerMock.createKibanaRequest(),
        kibanaResponseFactory
      )
    ).resolves.toMatchInlineSnapshot(`
      KibanaResponse {
        "options": Object {
          "body": "Chat is disabled through experiments",
        },
        "payload": "Chat is disabled through experiments",
        "status": 400,
      }
    `);
  });

  test('returns user information taken from saml metadata and a token', async () => {
    const username = 'user.name';
    const email = 'user@elastic.co';

    security.authc.getCurrentUser.mockReturnValueOnce(
      securityServiceMock.createMockAuthenticatedUser({
        username,
        metadata: {
          saml_email: [email],
        } as MetaWithSaml,
      })
    );

    const router = httpServiceMock.createRouter();
    registerChatRoute({
      router,
      isDev: false,
      chatIdentitySecret: 'secret',
      trialBuffer: 60,
      trialEndDate: new Date(),
    });
    const [_config, handler] = router.get.mock.calls[0];
    await expect(
      handler(
        requestHandlerContextMock,
        httpServerMock.createKibanaRequest(),
        kibanaResponseFactory
      )
    ).resolves.toMatchInlineSnapshot(`
      KibanaResponse {
        "options": Object {
          "body": Object {
            "chatVariant": "header",
            "email": "${email}",
            "id": "${username}",
            "token": "json-web-token",
          },
        },
        "payload": Object {
          "chatVariant": "header",
          "email": "${email}",
          "id": "${username}",
          "token": "json-web-token",
        },
        "status": 200,
      }
      `);
  });

  test('returns placeholder user information and a token in dev mode', async () => {
    const username = 'first.last';
    const email = 'test+first.last@elasticsearch.com';

    security.authc.getCurrentUser.mockReturnValueOnce(
      securityServiceMock.createMockAuthenticatedUser({
        username: undefined,
      })
    );

    const router = httpServiceMock.createRouter();
    registerChatRoute({
      router,
      isDev: true,
      chatIdentitySecret: 'secret',
      trialBuffer: 60,
      trialEndDate: new Date(),
    });
    const [_config, handler] = router.get.mock.calls[0];
    await expect(
      handler(
        requestHandlerContextMock,
        httpServerMock.createKibanaRequest(),
        kibanaResponseFactory
      )
    ).resolves.toMatchInlineSnapshot(`
      KibanaResponse {
        "options": Object {
          "body": Object {
            "chatVariant": "header",
            "email": "${email}",
            "id": "${username}",
            "token": "json-web-token",
          },
        },
        "payload": Object {
          "chatVariant": "header",
          "email": "${email}",
          "id": "${username}",
          "token": "json-web-token",
        },
        "status": 200,
      }
      `);
  });

  test('returns chat variant', async () => {
    const username = 'user.name';
    const email = 'user@elastic.co';

    security.authc.getCurrentUser.mockReturnValueOnce(
      securityServiceMock.createMockAuthenticatedUser({
        username,
        metadata: {
          saml_email: [email],
        } as MetaWithSaml,
      })
    );

    const router = httpServiceMock.createRouter();
    featureFlags.getStringValue.mockResolvedValueOnce('bubble');
    registerChatRoute({
      router,
      isDev: false,
      chatIdentitySecret: 'secret',
      trialBuffer: 60,
      trialEndDate: new Date(),
    });
    const [_config, handler] = router.get.mock.calls[0];
    await expect(
      handler(
        requestHandlerContextMock,
        httpServerMock.createKibanaRequest(),
        kibanaResponseFactory
      )
    ).resolves.toMatchInlineSnapshot(`
      KibanaResponse {
        "options": Object {
          "body": Object {
            "chatVariant": "bubble",
            "email": "${email}",
            "id": "${username}",
            "token": "json-web-token",
          },
        },
        "payload": Object {
          "chatVariant": "bubble",
          "email": "${email}",
          "id": "${username}",
          "token": "json-web-token",
        },
        "status": 200,
      }
      `);
  });
});
