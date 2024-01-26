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

import { httpServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { kibanaResponseFactory } from '@kbn/core/server';
import { registerChatRoute } from './chat';
import { ChatVariant } from '../../common/types';

describe('chat route', () => {
  const getChatVariant = async (): Promise<ChatVariant> => 'header';
  const getChatDisabledThroughExperiments = async (): Promise<boolean> => false;

  test('do not add the route if security is not enabled', async () => {
    const router = httpServiceMock.createRouter();
    registerChatRoute({
      router,
      isDev: false,
      chatIdentitySecret: 'secret',
      trialBuffer: 60,
      getChatVariant,
      getChatDisabledThroughExperiments,
    });
    expect(router.get.mock.calls).toEqual([]);
  });

  test('error if no user', async () => {
    const security = securityMock.createSetup();
    security.authc.getCurrentUser.mockReturnValueOnce(null);

    const router = httpServiceMock.createRouter();
    registerChatRoute({
      router,
      security,
      isDev: false,
      chatIdentitySecret: 'secret',
      trialBuffer: 60,
      trialEndDate: new Date(),
      getChatVariant,
      getChatDisabledThroughExperiments,
    });

    const [_config, handler] = router.get.mock.calls[0];

    await expect(handler({}, httpServerMock.createKibanaRequest(), kibanaResponseFactory)).resolves
      .toMatchInlineSnapshot(`
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
    const security = securityMock.createSetup();
    const username = 'user.name';
    const email = 'user@elastic.co';

    security.authc.getCurrentUser.mockReturnValueOnce({
      username,
      metadata: {
        saml_email: [email],
      },
    });

    const router = httpServiceMock.createRouter();
    registerChatRoute({
      router,
      security,
      isDev: false,
      chatIdentitySecret: 'secret',
      trialBuffer: 2,
      getChatVariant,
      getChatDisabledThroughExperiments,
    });

    const [_config, handler] = router.get.mock.calls[0];

    await expect(handler({}, httpServerMock.createKibanaRequest(), kibanaResponseFactory)).resolves
      .toMatchInlineSnapshot(`
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
    const security = securityMock.createSetup();
    const username = 'user.name';
    const email = 'user@elastic.co';

    security.authc.getCurrentUser.mockReturnValueOnce({
      username,
      metadata: {
        saml_email: [email],
      },
    });

    const router = httpServiceMock.createRouter();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() - 30);
    registerChatRoute({
      router,
      security,
      isDev: false,
      chatIdentitySecret: 'secret',
      trialBuffer: 2,
      trialEndDate,
      getChatVariant,
      getChatDisabledThroughExperiments,
    });

    const [_config, handler] = router.get.mock.calls[0];

    await expect(handler({}, httpServerMock.createKibanaRequest(), kibanaResponseFactory)).resolves
      .toMatchInlineSnapshot(`
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
    const security = securityMock.createSetup();
    const username = 'user.name';
    const email = 'user@elastic.co';

    security.authc.getCurrentUser.mockReturnValueOnce({
      username,
      metadata: {
        saml_email: [email],
      },
    });

    const router = httpServiceMock.createRouter();
    registerChatRoute({
      router,
      security,
      isDev: false,
      chatIdentitySecret: 'secret',
      trialBuffer: 60,
      trialEndDate: new Date(),
      getChatVariant,
      getChatDisabledThroughExperiments: async () => true,
    });
    const [_config, handler] = router.get.mock.calls[0];
    await expect(handler({}, httpServerMock.createKibanaRequest(), kibanaResponseFactory)).resolves
      .toMatchInlineSnapshot(`
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
    const security = securityMock.createSetup();
    const username = 'user.name';
    const email = 'user@elastic.co';

    security.authc.getCurrentUser.mockReturnValueOnce({
      username,
      metadata: {
        saml_email: [email],
      },
    });

    const router = httpServiceMock.createRouter();
    registerChatRoute({
      router,
      security,
      isDev: false,
      chatIdentitySecret: 'secret',
      trialBuffer: 60,
      trialEndDate: new Date(),
      getChatVariant,
      getChatDisabledThroughExperiments,
    });
    const [_config, handler] = router.get.mock.calls[0];
    await expect(handler({}, httpServerMock.createKibanaRequest(), kibanaResponseFactory)).resolves
      .toMatchInlineSnapshot(`
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
    const security = securityMock.createSetup();
    const username = 'first.last';
    const email = 'test+first.last@elasticsearch.com';

    security.authc.getCurrentUser.mockReturnValueOnce({});

    const router = httpServiceMock.createRouter();
    registerChatRoute({
      router,
      security,
      isDev: true,
      chatIdentitySecret: 'secret',
      trialBuffer: 60,
      trialEndDate: new Date(),
      getChatVariant,
      getChatDisabledThroughExperiments,
    });
    const [_config, handler] = router.get.mock.calls[0];
    await expect(handler({}, httpServerMock.createKibanaRequest(), kibanaResponseFactory)).resolves
      .toMatchInlineSnapshot(`
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
    const security = securityMock.createSetup();
    const username = 'user.name';
    const email = 'user@elastic.co';

    security.authc.getCurrentUser.mockReturnValueOnce({
      username,
      metadata: {
        saml_email: [email],
      },
    });

    const router = httpServiceMock.createRouter();
    registerChatRoute({
      router,
      security,
      isDev: false,
      chatIdentitySecret: 'secret',
      trialBuffer: 60,
      trialEndDate: new Date(),
      getChatVariant: async () => 'bubble',
      getChatDisabledThroughExperiments,
    });
    const [_config, handler] = router.get.mock.calls[0];
    await expect(handler({}, httpServerMock.createKibanaRequest(), kibanaResponseFactory)).resolves
      .toMatchInlineSnapshot(`
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
