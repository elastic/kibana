/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { xpackMocks } from '../../../../../../x-pack/mocks';
import { httpServerMock } from 'src/core/server/mocks';
import { PostIngestSetupResponse } from '../../../common';
import { RegistryError } from '../../errors';
import { createAppContextStartContractMock } from '../../mocks';
import { ingestManagerSetupHandler } from './handlers';
import { appContextService } from '../../services/app_context';
import { setupIngestManager } from '../../services/setup';

jest.mock('../../services/setup', () => {
  return {
    setupIngestManager: jest.fn(),
  };
});

const mockSetupIngestManager = setupIngestManager as jest.MockedFunction<typeof setupIngestManager>;

describe('ingestManagerSetupHandler', () => {
  let context: ReturnType<typeof xpackMocks.createRequestHandlerContext>;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let request: ReturnType<typeof httpServerMock.createKibanaRequest>;

  beforeEach(async () => {
    context = xpackMocks.createRequestHandlerContext();
    response = httpServerMock.createResponseFactory();
    request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: '/api/ingest_manager/setup',
    });
    // prevents `Logger not set.` and other appContext errors
    appContextService.start(createAppContextStartContractMock());
  });

  afterEach(async () => {
    jest.clearAllMocks();
    appContextService.stop();
  });

  it('POST /setup succeeds w/200 and body of resolved value', async () => {
    mockSetupIngestManager.mockImplementation(() => Promise.resolve({ isIntialized: true }));
    await ingestManagerSetupHandler(context, request, response);

    const expectedBody: PostIngestSetupResponse = { isInitialized: true };
    expect(response.customError).toHaveBeenCalledTimes(0);
    expect(response.ok).toHaveBeenCalledWith({ body: expectedBody });
  });

  it('POST /setup fails w/500 on custom error', async () => {
    mockSetupIngestManager.mockImplementation(() =>
      Promise.reject(new Error('SO method mocked to throw'))
    );
    await ingestManagerSetupHandler(context, request, response);

    expect(response.customError).toHaveBeenCalledTimes(1);
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: {
        message: 'SO method mocked to throw',
      },
    });
  });

  it('POST /setup fails w/502 on RegistryError', async () => {
    mockSetupIngestManager.mockImplementation(() =>
      Promise.reject(new RegistryError('Registry method mocked to throw'))
    );

    await ingestManagerSetupHandler(context, request, response);
    expect(response.customError).toHaveBeenCalledTimes(1);
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 502,
      body: {
        message: 'Registry method mocked to throw',
      },
    });
  });
});
