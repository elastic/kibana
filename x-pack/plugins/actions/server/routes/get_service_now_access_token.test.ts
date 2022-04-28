/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getServiceNowAccessToken } from './get_service_now_access_token';
import { Logger } from '@kbn/core/server';
import { httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { mockHandlerArguments } from './legacy/_mock_handler_arguments';
import { verifyAccessAndContext } from './verify_access_and_context';
import { getAccessToken } from '../builtin_action_types/servicenow/utils';
import { actionsConfigMock } from '../actions_config.mock';

jest.mock('./verify_access_and_context', () => ({
  verifyAccessAndContext: jest.fn(),
}));
jest.mock('../builtin_action_types/servicenow/utils', () => ({
  getAccessToken: jest.fn(),
}));

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
const configurationUtilities = actionsConfigMock.create();

beforeEach(() => {
  jest.resetAllMocks();
  (verifyAccessAndContext as jest.Mock).mockImplementation((license, handler) => handler);
  (getAccessToken as jest.Mock).mockResolvedValue(`Bearer tokentokentoken`);
});

describe('getServiceNowAccessToken', () => {
  it('returns access token for given oauth config', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getServiceNowAccessToken(router, licenseState, logger, configurationUtilities);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(
      `"/internal/actions/connector/_servicenow_access_token"`
    );

    const [context, req, res] = mockHandlerArguments(
      {},
      {
        body: {
          apiUrl: 'https://testurl.service-now.com/',
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
      ['ok']
    );

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "accessToken": "Bearer tokentokentoken",
        },
      }
    `);

    expect(getAccessToken as jest.Mock).toHaveBeenCalledWith({
      logger,
      configurationUtilities,
      credentials: {
        config: {
          clientId: 'abc',
          jwtKeyId: 'def',
          userIdentifierValue: 'userA',
          isOAuth: true,
        },
        secrets: {
          clientSecret: 'iamasecret',
          privateKey: 'xyz',
        },
      },
      snServiceUrl: 'https://testurl.service-now.com/',
    });

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        accessToken: 'Bearer tokentokentoken',
      },
    });
  });

  it('ensures the license allows getting servicenow access token', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getServiceNowAccessToken(router, licenseState, logger, configurationUtilities);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(
      `"/internal/actions/connector/_servicenow_access_token"`
    );

    const [context, req, res] = mockHandlerArguments(
      {},
      {
        body: {
          apiUrl: 'https://testurl.service-now.com/',
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

    getServiceNowAccessToken(router, licenseState, logger, configurationUtilities);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(
      `"/internal/actions/connector/_servicenow_access_token"`
    );

    const [context, req, res] = mockHandlerArguments(
      {},
      {
        body: {
          apiUrl: 'https://testurl.service-now.com/',
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
      ['ok']
    );

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });
});
