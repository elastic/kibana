/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpApiTestSetupMock } from '../../mocks';
import { createHttpApiTestSetupMock } from '../../mocks';
import type { UploadActionApiRequestBody } from '../../../../common/endpoint/schema/actions';
import type { getActionFileUploadHandler } from './file_upload_handler';
import { registerActionFileUploadRoute } from './file_upload_handler';
import { UPLOAD_ROUTE } from '../../../../common/endpoint/constants';
import { getEndpointAuthzInitialStateMock } from '../../../../common/endpoint/service/authz/mocks';
import { EndpointAuthorizationError } from '../../errors';
import type { HapiReadableStream } from '../../../types';
import { createHapiReadableStreamMock } from '../../services/actions/mocks';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';
import { CustomHttpRequestError } from '../../../utils/custom_http_request_error';
import type { ActionDetails } from '../../../../common/endpoint/types';
import { omit } from 'lodash';
import type { FleetFileClientInterface } from '@kbn/fleet-plugin/server';

describe('Upload response action create API handler', () => {
  type UploadHttpApiTestSetupMock = HttpApiTestSetupMock<never, never, UploadActionApiRequestBody>;

  let testSetup: UploadHttpApiTestSetupMock;
  let httpRequestMock: ReturnType<UploadHttpApiTestSetupMock['createRequestMock']>;
  let httpHandlerContextMock: UploadHttpApiTestSetupMock['httpHandlerContextMock'];
  let httpResponseMock: UploadHttpApiTestSetupMock['httpResponseMock'];

  let fleetFilesClientMock: jest.Mocked<FleetFileClientInterface>;

  beforeEach(async () => {
    testSetup = createHttpApiTestSetupMock<never, never, UploadActionApiRequestBody>();

    ({ httpHandlerContextMock, httpResponseMock } = testSetup);
    httpRequestMock = testSetup.createRequestMock();

    fleetFilesClientMock = (await testSetup.endpointAppContextMock.service.getFleetFilesClient(
      'from-host'
    )) as jest.Mocked<FleetFileClientInterface>;
  });

  describe('registerActionFileUploadRoute()', () => {
    it('should register the route', () => {
      registerActionFileUploadRoute(testSetup.routerMock, testSetup.endpointAppContextMock);

      expect(testSetup.getRegisteredRouteHandler('post', UPLOAD_ROUTE)).toBeDefined();
    });

    it('should NOT register route if feature flag is false', () => {
      // @ts-expect-error
      testSetup.endpointAppContextMock.experimentalFeatures.responseActionUploadEnabled = false;
      registerActionFileUploadRoute(testSetup.routerMock, testSetup.endpointAppContextMock);

      expect(() => testSetup.getRegisteredRouteHandler('post', UPLOAD_ROUTE)).toThrow(
        'Handler for [post][/api/endpoint/action/upload] not found'
      );
    });

    it('should use maxUploadResponseActionFileBytes config value', () => {
      // @ts-expect-error
      testSetup.endpointAppContextMock.serverConfig.maxUploadResponseActionFileBytes = 999;
      registerActionFileUploadRoute(testSetup.routerMock, testSetup.endpointAppContextMock);

      expect(testSetup.getRegisteredRouteConfig('post', UPLOAD_ROUTE)?.options?.body).toEqual({
        accepts: ['multipart/form-data'],
        maxBytes: 999,
        output: 'stream',
      });
    });

    it('should error if user has no authz to api', async () => {
      (
        (await httpHandlerContextMock.securitySolution).getEndpointAuthz as jest.Mock
      ).mockResolvedValue(getEndpointAuthzInitialStateMock({ canWriteFileOperations: false }));
      registerActionFileUploadRoute(testSetup.routerMock, testSetup.endpointAppContextMock);
      await testSetup.getRegisteredRouteHandler('post', UPLOAD_ROUTE)(
        httpHandlerContextMock,
        httpRequestMock,
        httpResponseMock
      );

      expect(httpResponseMock.forbidden).toHaveBeenCalledWith({
        body: expect.any(EndpointAuthorizationError),
      });
    });
  });

  describe('route request handler', () => {
    let callHandler: () => ReturnType<ReturnType<typeof getActionFileUploadHandler>>;
    let fileContent: HapiReadableStream;
    let createdUploadAction: ActionDetails;

    beforeEach(() => {
      fileContent = createHapiReadableStreamMock();

      const reqBody: UploadActionApiRequestBody = {
        file: fileContent,
        endpoint_ids: ['123-456'],
        parameters: {
          overwrite: true,
        },
      };

      httpRequestMock = testSetup.createRequestMock({ body: reqBody });
      registerActionFileUploadRoute(testSetup.routerMock, testSetup.endpointAppContextMock);

      createdUploadAction = new EndpointActionGenerator('seed').generateActionDetails({
        command: 'upload',
      });

      (
        testSetup.endpointAppContextMock.service.getActionCreateService().createAction as jest.Mock
      ).mockResolvedValue(createdUploadAction);

      const handler: ReturnType<typeof getActionFileUploadHandler> =
        testSetup.getRegisteredRouteHandler('post', UPLOAD_ROUTE);

      callHandler = () => handler(httpHandlerContextMock, httpRequestMock, httpResponseMock);
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    it('should create a file', async () => {
      await callHandler();

      expect(fleetFilesClientMock.create).toHaveBeenCalledWith(fileContent, ['123-456']);
    });

    it('should create the action using parameters with stored file info', async () => {
      await callHandler();
      const casesClientMock =
        testSetup.endpointAppContextMock.service.getCasesClient(httpRequestMock);
      const createActionMock = testSetup.endpointAppContextMock.service.getActionCreateService()
        .createAction as jest.Mock;

      expect(createActionMock).toHaveBeenCalledWith(
        {
          command: 'upload',
          endpoint_ids: ['123-456'],
          parameters: {
            file_id: '123-456-789',
            file_name: 'foo.txt',
            file_sha256: '96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
            file_size: 45632,
            overwrite: true,
          },
          user: undefined,
        },
        { casesClient: casesClientMock }
      );
    });

    it('should delete file if creation of Action fails', async () => {
      const createActionMock = testSetup.endpointAppContextMock.service.getActionCreateService()
        .createAction as jest.Mock;
      createActionMock.mockImplementation(async () => {
        throw new CustomHttpRequestError('oh oh');
      });
      await callHandler();

      expect(fleetFilesClientMock.delete).toHaveBeenCalledWith('123-456-789');
    });

    it('should update file with action id', async () => {
      await callHandler();

      expect(fleetFilesClientMock.update).toHaveBeenCalledWith('123-456-789', { actionId: '123' });
    });

    it('should return expected response on success', async () => {
      await callHandler();

      expect(httpResponseMock.ok).toHaveBeenCalledWith({
        body: {
          action: createdUploadAction.action,
          data: omit(createdUploadAction, 'action'),
        },
      });
    });
  });
});
