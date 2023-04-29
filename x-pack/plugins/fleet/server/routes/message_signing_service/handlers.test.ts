/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwaitedProperties } from '@kbn/utility-types';
import { httpServerMock, coreMock } from '@kbn/core/server/mocks';
import type { KibanaRequest } from '@kbn/core/server';

import { createAppContextStartContractMock, xpackMocks } from '../../mocks';
import { appContextService } from '../../services';
import type { FleetRequestHandlerContext } from '../../types';

import { rotateKeyPairHandler } from './handlers';

describe('FleetMessageSigningServiceHandler', () => {
  let context: AwaitedProperties<Omit<FleetRequestHandlerContext, 'resolve'>>;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let request: KibanaRequest<
    undefined,
    Readonly<{} & { acknowledge: boolean }> | undefined,
    undefined,
    any
  >;

  beforeEach(async () => {
    context = xpackMocks.createRequestHandlerContext();
    request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: '/api/fleet/message_signing_service/rotate_key_pair',
      query: { acknowledge: true },
      params: {},
      body: {},
    });
    response = httpServerMock.createResponseFactory();
    // prevents `Logger not set.` and other appContext errors
    appContextService.start(createAppContextStartContractMock());
  });

  afterEach(async () => {
    jest.clearAllMocks();
    appContextService.stop();
  });

  it(`POST /message_signing_service/rotate_key_pair?acknowledge=true fails with an 500 with "acknowledge=true" when no messaging service`, async () => {
    appContextService.start({
      ...createAppContextStartContractMock(),
      // @ts-expect-error
      messageSigningService: undefined,
    });

    await rotateKeyPairHandler(
      coreMock.createCustomRequestHandlerContext(context),
      request,
      response
    );
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: {
        message: 'Failed to rotate key pair. Message signing service is unavailable!',
      },
    });
  });

  it('POST /message_signing_service/rotate_key_pair?acknowledge=true succeeds with `acknowledge=true`', async () => {
    await rotateKeyPairHandler(
      coreMock.createCustomRequestHandlerContext(context),
      request,
      response
    );
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        message: 'Key pair rotated successfully.',
      },
    });
  });

  it.each([
    'foo',
    Error('do not show this').message,
    Error(JSON.stringify({ not: 'even this' })).message,
  ])(
    'POST /message_signing_service/rotate_key_pair?acknowledge=true throws only a generic 500 error if rotate fails with error `%s`',
    async (error) => {
      // specific error
      (appContextService.getMessageSigningService()?.rotateKeyPair as jest.Mock).mockRejectedValue(
        Error(error)
      );

      await rotateKeyPairHandler(
        coreMock.createCustomRequestHandlerContext(context),
        request,
        response
      );

      // API shows generic error
      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'Failed to rotate key pair!',
        },
      });
    }
  );
});
