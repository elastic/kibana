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

import { httpServiceMock, httpServerMock } from '../../../../../src/core/server/mocks';
import { securityMock } from '../../../security/server/mocks';
import { kibanaResponseFactory } from 'src/core/server';
import { registerChatRoute } from './chat';

describe('chat route', () => {
  test('do not add the route if security is not enabled', async () => {
    const router = httpServiceMock.createRouter();
    registerChatRoute({ router, isDev: false, chatIdentitySecret: 'secret' });
    expect(router.get.mock.calls).toEqual([]);
  });

  test('error if no user', async () => {
    const security = securityMock.createSetup();
    security.authc.getCurrentUser.mockReturnValueOnce(null);

    const router = httpServiceMock.createRouter();
    registerChatRoute({ router, security, isDev: false, chatIdentitySecret: 'secret' });

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
    registerChatRoute({ router, security, isDev: false, chatIdentitySecret: 'secret' });
    const [_config, handler] = router.get.mock.calls[0];
    await expect(handler({}, httpServerMock.createKibanaRequest(), kibanaResponseFactory)).resolves
      .toMatchInlineSnapshot(`
      KibanaResponse {
        "options": Object {
          "body": Object {
            "email": "${email}",
            "id": "${username}",
            "token": "json-web-token",
          },
        },
        "payload": Object {
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
    registerChatRoute({ router, security, isDev: true, chatIdentitySecret: 'secret' });
    const [_config, handler] = router.get.mock.calls[0];
    await expect(handler({}, httpServerMock.createKibanaRequest(), kibanaResponseFactory)).resolves
      .toMatchInlineSnapshot(`
      KibanaResponse {
        "options": Object {
          "body": Object {
            "email": "${email}",
            "id": "${username}",
            "token": "json-web-token",
          },
        },
        "payload": Object {
          "email": "${email}",
          "id": "${username}",
          "token": "json-web-token",
        },
        "status": 200,
      }
      `);
  });
});
