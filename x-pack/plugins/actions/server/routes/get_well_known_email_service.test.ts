/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getWellKnownEmailServiceRoute } from './get_well_known_email_service';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { mockHandlerArguments } from './legacy/_mock_handler_arguments';
import { verifyAccessAndContext } from './verify_access_and_context';

jest.mock('./verify_access_and_context', () => ({
  verifyAccessAndContext: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
  (verifyAccessAndContext as jest.Mock).mockImplementation((license, handler) => handler);
});

describe('getWellKnownEmailServiceRoute', () => {
  it('returns config for well known email service', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getWellKnownEmailServiceRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];
    expect(config.path).toMatchInlineSnapshot(
      `"/internal/actions/connector/_email_config/{service}"`
    );

    const [context, req, res] = mockHandlerArguments(
      {},
      {
        params: { service: 'gmail' },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "host": "smtp.gmail.com",
          "port": 465,
          "secure": true,
        },
      }
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
      },
    });
  });

  it('returns config for elastic cloud email service', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getWellKnownEmailServiceRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];
    expect(config.path).toMatchInlineSnapshot(
      `"/internal/actions/connector/_email_config/{service}"`
    );

    const [context, req, res] = mockHandlerArguments(
      {},
      {
        params: { service: 'elastic_cloud' },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "host": "dockerhost",
          "port": 10025,
          "secure": false,
        },
      }
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        host: 'dockerhost',
        port: 10025,
        secure: false,
      },
    });
  });

  it('returns empty for unknown service', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getWellKnownEmailServiceRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];
    expect(config.path).toMatchInlineSnapshot(
      `"/internal/actions/connector/_email_config/{service}"`
    );

    const [context, req, res] = mockHandlerArguments(
      {},
      {
        params: { service: 'foo' },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Object {},
      }
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: {},
    });
  });

  it('ensures the license allows getting well known email service config', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getWellKnownEmailServiceRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      {},
      {
        params: { service: 'gmail' },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });

  it('ensures the license check prevents getting well known email service config', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyAccessAndContext as jest.Mock).mockImplementation(() => async () => {
      throw new Error('OMG');
    });

    getWellKnownEmailServiceRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      {},
      {
        params: { service: 'gmail' },
      },
      ['ok']
    );

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });
});
