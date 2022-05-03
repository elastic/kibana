/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOAuthAccessToken } from './get_oauth_access_token';
import { Logger } from '@kbn/core/server';
import { httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { mockHandlerArguments } from './legacy/_mock_handler_arguments';
import { verifyAccessAndContext } from './verify_access_and_context';
import { getOAuthJwtAccessToken } from '../builtin_action_types/lib/get_oauth_jwt_access_token';
import { getOAuthClientCredentialsAccessToken } from '../builtin_action_types/lib/get_oauth_client_credentials_access_token';
import { actionsConfigMock } from '../actions_config.mock';

jest.mock('./verify_access_and_context', () => ({
  verifyAccessAndContext: jest.fn(),
}));
jest.mock('../builtin_action_types/lib/get_oauth_jwt_access_token', () => ({
  getOAuthJwtAccessToken: jest.fn(),
}));
jest.mock('../builtin_action_types/lib/get_oauth_client_credentials_access_token', () => ({
  getOAuthClientCredentialsAccessToken: jest.fn(),
}));

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
const configurationUtilities = actionsConfigMock.create();

beforeEach(() => {
  jest.resetAllMocks();
  (verifyAccessAndContext as jest.Mock).mockImplementation((license, handler) => handler);
  (getOAuthJwtAccessToken as jest.Mock).mockResolvedValue(`Bearer jwttokentokentoken`);
  (getOAuthClientCredentialsAccessToken as jest.Mock).mockResolvedValue(
    `Bearer clienttokentokentoken`
  );
});

describe('getOAuthAccessToken', () => {
  it('returns jwt access token for given jwt oauth config', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getOAuthAccessToken(router, licenseState, logger, configurationUtilities);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/actions/connector/_oauth_access_token"`);

    const [context, req, res] = mockHandlerArguments(
      {},
      {
        body: {
          type: 'jwt',
          options: {
            tokenUrl: 'https://testurl.service-now.com/oauth_token.do',
            config: {
              clientId: 'abc',
              jwtKeyId: 'def',
              userIdentifierValue: 'userA',
            },
            secrets: {
              clientSecret: 'iamasecret',
              privateKey: 'xyz',
            },
          },
        },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "accessToken": "Bearer jwttokentokentoken",
        },
      }
    `);

    expect(getOAuthJwtAccessToken as jest.Mock).toHaveBeenCalledWith({
      logger,
      configurationUtilities,
      credentials: {
        config: {
          clientId: 'abc',
          jwtKeyId: 'def',
          userIdentifierValue: 'userA',
        },
        secrets: {
          clientSecret: 'iamasecret',
          privateKey: 'xyz',
        },
      },
      tokenUrl: 'https://testurl.service-now.com/oauth_token.do',
    });
    expect(getOAuthClientCredentialsAccessToken).not.toHaveBeenCalled();

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        accessToken: 'Bearer jwttokentokentoken',
      },
    });
  });

  it('returns client credentials access token for given client credentials oauth config', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getOAuthAccessToken(router, licenseState, logger, configurationUtilities);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/actions/connector/_oauth_access_token"`);

    const [context, req, res] = mockHandlerArguments(
      {},
      {
        body: {
          type: 'client',
          options: {
            tokenUrl: 'https://login.microsoftonline.com/98765/oauth2/v2.0/token',
            scope: 'https://graph.microsoft.com/.default',
            config: {
              clientId: 'abc',
              tenantId: 'def',
            },
            secrets: {
              clientSecret: 'iamasecret',
            },
          },
        },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "accessToken": "Bearer clienttokentokentoken",
        },
      }
    `);

    expect(getOAuthClientCredentialsAccessToken as jest.Mock).toHaveBeenCalledWith({
      logger,
      configurationUtilities,
      credentials: {
        config: {
          clientId: 'abc',
          tenantId: 'def',
        },
        secrets: {
          clientSecret: 'iamasecret',
        },
      },
      tokenUrl: 'https://login.microsoftonline.com/98765/oauth2/v2.0/token',
      oAuthScope: 'https://graph.microsoft.com/.default',
    });
    expect(getOAuthJwtAccessToken).not.toHaveBeenCalled();

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        accessToken: 'Bearer clienttokentokentoken',
      },
    });
  });

  it('ensures the license allows getting servicenow access token', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getOAuthAccessToken(router, licenseState, logger, configurationUtilities);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/actions/connector/_oauth_access_token"`);

    const [context, req, res] = mockHandlerArguments(
      {},
      {
        body: {
          type: 'jwt',
          options: {
            tokenUrl: 'https://testurl.service-now.com/oauth_token.do',
            config: {
              clientId: 'abc',
              jwtKeyId: 'def',
              userIdentifierValue: 'userA',
            },
            secrets: {
              clientSecret: 'iamasecret',
              privateKey: 'xyz',
            },
          },
        },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });

  it('ensures the license check prevents getting service now access token', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyAccessAndContext as jest.Mock).mockImplementation(() => async () => {
      throw new Error('OMG');
    });

    getOAuthAccessToken(router, licenseState, logger, configurationUtilities);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/actions/connector/_oauth_access_token"`);

    const [context, req, res] = mockHandlerArguments(
      {},
      {
        body: {
          type: 'client',
          options: {
            tokenUrl: 'https://login.microsoftonline.com/98765/oauth2/v2.0/token',
            scope: 'https://graph.microsoft.com/.default',
            config: {
              clientId: 'abc',
              tenantId: 'def',
            },
            secrets: {
              clientSecret: 'iamasecret',
            },
          },
        },
      },
      ['ok']
    );

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });
});
