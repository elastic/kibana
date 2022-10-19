/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getActionFileDownloadRouteHandler } from './file_download_handler';
import type { HttpApiTestSetupMock } from '../../mocks';
import { createHttpApiTestSetupMock } from '../../mocks';
import type { EndpointActionFileDownloadParams } from '../../../../common/endpoint/schema/actions';
import { getActionDetailsById as _getActionDetailsById } from '../../services';
import { NotFoundError } from '../../errors';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';
import { CustomHttpRequestError } from '../../../utils/custom_http_request_error';
import { getFileDownloadStream as _getFileDownloadStream } from '../../services/actions/action_files';
import stream from 'stream';
import type { ActionDetails } from '../../../../common/endpoint/types';

jest.mock('../../services');
jest.mock('../../services/actions/action_files');

describe('When file download handler is invoked', () => {
  const getActionDetailsById = _getActionDetailsById as jest.Mock;
  const getFileDownloadStream = _getFileDownloadStream as jest.Mock;

  let fileDownloadHandler: ReturnType<typeof getActionFileDownloadRouteHandler>;
  let esClientMock: ReturnType<HttpApiTestSetupMock['getEsClientMock']>;
  let httpRequestMock: ReturnType<
    HttpApiTestSetupMock<EndpointActionFileDownloadParams>['createRequestMock']
  >;
  let httpHandlerContextMock: HttpApiTestSetupMock<EndpointActionFileDownloadParams>['httpHandlerContextMock'];
  let httpResponseMock: HttpApiTestSetupMock<EndpointActionFileDownloadParams>['httpResponseMock'];
  let action: ActionDetails;

  beforeEach(() => {
    const apiTestSetup = createHttpApiTestSetupMock<EndpointActionFileDownloadParams>();

    ({ httpHandlerContextMock, httpResponseMock } = apiTestSetup);
    esClientMock = apiTestSetup.getEsClientMock();
    httpRequestMock = apiTestSetup.createRequestMock({
      params: { action_id: '111', agent_id: '222' },
    });
    action = new EndpointActionGenerator().generateActionDetails({
      id: '111',
      agents: ['222'],
    });
    fileDownloadHandler = getActionFileDownloadRouteHandler(apiTestSetup.endpointAppContextMock);

    getActionDetailsById.mockImplementation(async () => {
      return action;
    });

    getFileDownloadStream.mockImplementation(async () => {
      return {
        stream: new stream.Readable(),
        fileName: 'test.txt',
        mimeType: 'text/plain',
      };
    });
  });

  it('should error if action ID is invalid', async () => {
    getActionDetailsById.mockImplementationOnce(async () => {
      throw new NotFoundError('not found');
    });
    await fileDownloadHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

    expect(httpResponseMock.notFound).toHaveBeenCalled();
  });

  it('should error if agent id is not in the action', async () => {
    action.agents = ['333'];
    await fileDownloadHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

    expect(httpResponseMock.customError).toHaveBeenCalledWith({
      statusCode: 400,
      body: expect.any(CustomHttpRequestError),
    });
  });

  it('should retrieve the download Stream using correct file ID', async () => {
    await fileDownloadHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

    expect(getFileDownloadStream).toHaveBeenCalledWith(esClientMock, expect.anything(), '111.222');
  });

  it('should respond with expected HTTP headers', async () => {
    await fileDownloadHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

    expect(httpResponseMock.ok).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: {
          'cache-control': 'max-age=31536000, immutable',
          'content-disposition': 'attachment; filename="test.txt"',
          'content-type': 'application/octet-stream',
          'x-content-type-options': 'nosniff',
        },
      })
    );
  });
});
