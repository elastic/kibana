/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Subject } from 'rxjs';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ILicense } from '@kbn/licensing-plugin/common/types';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import type { License } from '@kbn/licensing-plugin/common/license';
import type { AwaitedProperties } from '@kbn/utility-types';
import type { KibanaRequest, KibanaResponseFactory, RequestHandler } from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  httpServiceMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import type { CasesClientMock } from '@kbn/cases-plugin/server/client/mocks';

import { LicenseService } from '../../../../common/license';
import {
  ENDPOINT_ACTIONS_INDEX,
  EXECUTE_ROUTE,
  GET_FILE_ROUTE,
  GET_PROCESSES_ROUTE,
  ISOLATE_HOST_ROUTE,
  ISOLATE_HOST_ROUTE_V2,
  KILL_PROCESS_ROUTE,
  SCAN_ROUTE,
  SUSPEND_PROCESS_ROUTE,
  UNISOLATE_HOST_ROUTE,
  UNISOLATE_HOST_ROUTE_V2,
  UPLOAD_ROUTE,
} from '../../../../common/endpoint/constants';
import type {
  ActionDetails,
  HostMetadata,
  LogsEndpointAction,
  ResponseActionApiResponse,
} from '../../../../common/endpoint/types';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import type { EndpointAuthz } from '../../../../common/endpoint/types/authz';
import type { SecuritySolutionRequestHandlerContextMock } from '../../../lib/detection_engine/routes/__mocks__/request_context';
import { EndpointAppContextService } from '../../endpoint_app_context_services';
import type { HttpApiTestSetupMock } from '../../mocks';
import {
  createHttpApiTestSetupMock,
  createMockEndpointAppContext,
  createMockEndpointAppContextServiceSetupContract,
  createMockEndpointAppContextServiceStartContract,
  createRouteHandlerContext,
  getRegisteredVersionedRouteMock,
} from '../../mocks';
import { legacyMetadataSearchResponseMock } from '../metadata/support/test_support';
import { registerResponseActionRoutes } from './response_actions';
import * as ActionDetailsService from '../../services/actions/action_details_by_id';
import { CaseStatuses } from '@kbn/cases-components';
import { getEndpointAuthzInitialStateMock } from '../../../../common/endpoint/service/authz/mocks';
import { getResponseActionsClient as _getResponseActionsClient } from '../../services';
import type {
  ResponseActionsRequestBody,
  UploadActionApiRequestBody,
} from '../../../../common/api/endpoint';
import type { FleetToHostFileClientInterface } from '@kbn/fleet-plugin/server';
import type { HapiReadableStream, SecuritySolutionRequestHandlerContext } from '../../../types';
import { createHapiReadableStreamMock } from '../../services/actions/mocks';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';
import { CustomHttpRequestError } from '../../../utils/custom_http_request_error';
import { omit, set } from 'lodash';
import type { ResponseActionAgentType } from '../../../../common/endpoint/service/response_actions/constants';
import { responseActionsClientMock } from '../../services/actions/clients/mocks';
import type { ActionsApiRequestHandlerContext } from '@kbn/actions-plugin/server';
import { sentinelOneMock } from '../../services/actions/clients/sentinelone/mocks';
import { ResponseActionsClientError } from '../../services/actions/clients/errors';
import type { EndpointAppContext } from '../../types';
import type { ExperimentalFeatures } from '../../../../common';

jest.mock('../../services', () => {
  const realModule = jest.requireActual('../../services');

  return {
    ...realModule,
    getResponseActionsClient: jest.fn((...args) => {
      return realModule.getResponseActionsClient(...args);
    }),
  };
});

const getResponseActionsClientMock = _getResponseActionsClient;

interface CallRouteInterface {
  body?: ResponseActionsRequestBody;
  indexErrorResponse?: any;
  searchResponse?: HostMetadata;
  mockUser?: any;
  license?: License;
  authz?: Partial<EndpointAuthz>;
  /** Api version if any */
  version?: string;
}

const Platinum = licenseMock.createLicense({ license: { type: 'platinum', mode: 'platinum' } });
const Gold = licenseMock.createLicense({ license: { type: 'gold', mode: 'gold' } });

describe('Response actions', () => {
  let getActionDetailsByIdSpy: jest.SpyInstance;

  beforeEach(() => {
    getActionDetailsByIdSpy = jest
      .spyOn(ActionDetailsService, 'getActionDetailsById')
      .mockResolvedValue(new EndpointActionGenerator('seed').generateActionDetails());
  });

  describe('handler', () => {
    let endpointAppContextService: EndpointAppContextService;
    let mockResponse: jest.Mocked<KibanaResponseFactory>;
    let licenseService: LicenseService;
    let licenseEmitter: Subject<ILicense>;
    let endpointContext: EndpointAppContext;

    let callRoute: (
      routePrefix: string,
      opts: CallRouteInterface,
      indexExists?: { endpointDsExists: boolean }
    ) => Promise<AwaitedProperties<SecuritySolutionRequestHandlerContextMock>>;
    const superUser = {
      username: 'superuser',
      roles: ['superuser'],
    };

    const docGen = new EndpointDocGenerator();

    const setFeatureFlag = (ff: Partial<ExperimentalFeatures>) => {
      endpointContext.experimentalFeatures = {
        ...endpointContext.experimentalFeatures,
        ...ff,
      };
    };

    beforeEach(() => {
      // instantiate... everything
      const mockScopedClient = elasticsearchServiceMock.createScopedClusterClient();
      const mockClusterClient = elasticsearchServiceMock.createClusterClient();
      mockClusterClient.asScoped.mockReturnValue(mockScopedClient);
      const routerMock = httpServiceMock.createRouter();
      mockResponse = httpServerMock.createResponseFactory();
      const startContract = createMockEndpointAppContextServiceStartContract();
      (startContract.messageSigningService?.sign as jest.Mock).mockImplementation(() => {
        return {
          data: 'thisisthedata',
          signature: 'thisisasignature',
        };
      });
      endpointAppContextService = new EndpointAppContextService();
      const mockSavedObjectClient = savedObjectsClientMock.create();

      licenseEmitter = new Subject();
      licenseService = new LicenseService();
      licenseService.start(licenseEmitter);

      endpointContext = {
        ...createMockEndpointAppContext(),
        service: endpointAppContextService,
      };

      endpointAppContextService.setup(createMockEndpointAppContextServiceSetupContract());
      endpointAppContextService.start({
        ...startContract,
        licenseService,
      });

      setFeatureFlag({ responseActionScanEnabled: true });

      // add the host isolation route handlers to routerMock
      registerResponseActionRoutes(routerMock, endpointContext);

      // define a convenience function to execute an API call for a given route, body, and mocked response from ES
      // it returns the requestContext mock used in the call, to assert internal calls (e.g. the indexed document)
      callRoute = async (
        routePrefix: string,
        {
          body,
          indexErrorResponse,
          searchResponse,
          mockUser,
          license,
          authz = {},
          version,
        }: CallRouteInterface,
        indexExists?: { endpointDsExists: boolean }
      ): Promise<AwaitedProperties<SecuritySolutionRequestHandlerContextMock>> => {
        const ctx = createRouteHandlerContext(mockScopedClient, mockSavedObjectClient);

        ctx.securitySolution.getEndpointAuthz.mockResolvedValue(
          getEndpointAuthzInitialStateMock(authz)
        );

        // mock _index_template
        ctx.core.elasticsearch.client.asInternalUser.indices.existsIndexTemplate.mockResponseImplementationOnce(
          () => {
            if (indexExists) {
              return {
                body: true,
                statusCode: 200,
              };
            }
            return {
              body: false,
              statusCode: 404,
            };
          }
        );
        const asUser = mockUser ? mockUser : superUser;
        (ctx.core.security.authc.getCurrentUser as jest.Mock).mockImplementationOnce(() => asUser);

        const metadataResponse = docGen.generateHostMetadata();

        const withErrorResponse = indexErrorResponse ? indexErrorResponse : { statusCode: 201 };
        ctx.core.elasticsearch.client.asInternalUser.index.mockResponseImplementation(
          () => withErrorResponse
        );
        ctx.core.elasticsearch.client.asInternalUser.search.mockResponseImplementation(() => {
          return {
            body: legacyMetadataSearchResponseMock(searchResponse ?? metadataResponse),
          };
        });

        const withLicense = license ? license : Platinum;
        licenseEmitter.next(withLicense);

        const mockRequest = httpServerMock.createKibanaRequest({ body });
        const routeHandler: RequestHandler<any, any, any, any> = version
          ? getRegisteredVersionedRouteMock(routerMock, 'post', routePrefix, version).routeHandler
          : routerMock.post.mock.calls.find(([{ path }]) => path.startsWith(routePrefix))![1];

        await routeHandler(ctx, mockRequest, mockResponse);

        return ctx;
      };
    });

    afterEach(() => {
      endpointAppContextService.stop();
      licenseService.stop();
      licenseEmitter.complete();
      getActionDetailsByIdSpy.mockClear();
    });

    it('correctly redirects legacy isolate to new route', async () => {
      await callRoute(ISOLATE_HOST_ROUTE, {
        body: { endpoint_ids: ['XYZ'] },
        version: '2023-10-31',
      });
      expect(mockResponse.custom).toBeCalled();
      const response = mockResponse.custom.mock.calls[0][0];
      expect(response.statusCode).toEqual(308);
      expect(response.headers?.location).toEqual(ISOLATE_HOST_ROUTE_V2);
    });

    it('correctly redirects legacy release to new route', async () => {
      await callRoute(UNISOLATE_HOST_ROUTE, {
        body: { endpoint_ids: ['XYZ'] },
        version: '2023-10-31',
      });
      expect(mockResponse.custom).toBeCalled();
      const response = mockResponse.custom.mock.calls[0][0];
      expect(response.statusCode).toEqual(308);
      expect(response.headers?.location).toEqual(UNISOLATE_HOST_ROUTE_V2);
    });

    it('succeeds when an endpoint ID is provided', async () => {
      await callRoute(ISOLATE_HOST_ROUTE_V2, {
        body: { endpoint_ids: ['XYZ'] },
        version: '2023-10-31',
      });
      expect(mockResponse.ok).toBeCalled();
    });

    it('accepts a comment field', async () => {
      await callRoute(ISOLATE_HOST_ROUTE_V2, {
        body: { endpoint_ids: ['XYZ'], comment: 'XYZ' },
        version: '2023-10-31',
      });
      expect(mockResponse.ok).toBeCalled();
    });

    it('sends the action to the requested agent', async () => {
      const metadataResponse = docGen.generateHostMetadata();
      const AgentID = metadataResponse.elastic.agent.id;
      await callRoute(ISOLATE_HOST_ROUTE_V2, {
        body: { endpoint_ids: ['ABC-XYZ-000'] },
        searchResponse: metadataResponse,
        version: '2023-10-31',
      });

      expect(
        (await endpointAppContextService.getFleetActionsClient()).create as jest.Mock
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          agents: [AgentID],
        })
      );
    });

    it('records the user who performed the action to the action record', async () => {
      const testUser = { username: 'testuser', roles: ['superuser'] };
      await callRoute(ISOLATE_HOST_ROUTE_V2, {
        body: { endpoint_ids: ['XYZ'] },
        mockUser: testUser,
        version: '2023-10-31',
      });

      expect(
        (await endpointAppContextService.getFleetActionsClient()).create as jest.Mock
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: testUser.username,
        })
      );
    });

    it('records the comment in the action payload', async () => {
      const comment = "I am isolating this because it's Friday";
      await callRoute(ISOLATE_HOST_ROUTE_V2, {
        body: { endpoint_ids: ['XYZ'], comment },
        version: '2023-10-31',
      });

      expect(
        (await endpointAppContextService.getFleetActionsClient()).create as jest.Mock
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ comment }),
        })
      );
    });

    it('creates an action and returns its ID (`action` legacy property) + ActionDetails', async () => {
      const endpointIds = ['XYZ'];
      const actionDetails = {
        agents: endpointIds,
        command: 'isolate',
        id: '1-2-3',
      } as ActionDetails;
      getActionDetailsByIdSpy.mockResolvedValue(actionDetails);

      await callRoute(ISOLATE_HOST_ROUTE_V2, {
        body: { endpoint_ids: endpointIds, comment: 'XYZ' },
        version: '2023-10-31',
      });

      expect(
        (await endpointAppContextService.getFleetActionsClient()).create as jest.Mock
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          action_id: expect.any(String),
        })
      );

      expect(mockResponse.ok).toBeCalled();

      expect((mockResponse.ok.mock.calls[0][0]?.body as ResponseActionApiResponse).action).toEqual(
        expect.any(String)
      );
      expect(getActionDetailsByIdSpy).toHaveBeenCalledTimes(1);

      expect((mockResponse.ok.mock.calls[0][0]?.body as ResponseActionApiResponse).data).toEqual(
        actionDetails
      );
    });

    it('records the timeout in the action payload', async () => {
      await callRoute(ISOLATE_HOST_ROUTE_V2, {
        body: { endpoint_ids: ['XYZ'] },
        version: '2023-10-31',
      });
      expect(
        (await endpointAppContextService.getFleetActionsClient()).create as jest.Mock
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 300,
        })
      );
    });

    it('sends the action to the correct agent when endpoint ID is given', async () => {
      const doc = docGen.generateHostMetadata();
      const agentId = doc.elastic.agent.id;

      await callRoute(ISOLATE_HOST_ROUTE_V2, {
        body: { endpoint_ids: ['XYZ'] },
        searchResponse: doc,
        version: '2023-10-31',
      });

      expect(
        (await endpointAppContextService.getFleetActionsClient()).create as jest.Mock
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          agents: [agentId],
        })
      );
    });

    it('sends the isolate command payload from the isolate route', async () => {
      await callRoute(ISOLATE_HOST_ROUTE_V2, {
        body: { endpoint_ids: ['XYZ'] },
        version: '2023-10-31',
      });

      expect(
        (await endpointAppContextService.getFleetActionsClient()).create as jest.Mock
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            command: 'isolate',
          }),
        })
      );
    });

    it('sends the unisolate command payload from the unisolate route', async () => {
      await callRoute(UNISOLATE_HOST_ROUTE_V2, {
        body: { endpoint_ids: ['XYZ'] },
        version: '2023-10-31',
      });

      expect(
        (await endpointAppContextService.getFleetActionsClient()).create as jest.Mock
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            command: 'unisolate',
          }),
        })
      );
    });

    it('sends the kill-process command payload from the kill process route', async () => {
      await callRoute(KILL_PROCESS_ROUTE, {
        body: { endpoint_ids: ['XYZ'] },
        version: '2023-10-31',
      });

      expect(
        (await endpointAppContextService.getFleetActionsClient()).create as jest.Mock
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            command: 'kill-process',
          }),
        })
      );
    });

    it('sends the suspend-process command payload from the suspend process route', async () => {
      await callRoute(SUSPEND_PROCESS_ROUTE, {
        body: { endpoint_ids: ['XYZ'] },
        version: '2023-10-31',
      });

      expect(
        (await endpointAppContextService.getFleetActionsClient()).create as jest.Mock
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            command: 'suspend-process',
          }),
        })
      );
    });

    it('sends the running-processes command payload from the running processes route', async () => {
      await callRoute(GET_PROCESSES_ROUTE, {
        body: { endpoint_ids: ['XYZ'] },
        version: '2023-10-31',
      });

      expect(
        (await endpointAppContextService.getFleetActionsClient()).create as jest.Mock
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            command: 'running-processes',
          }),
        })
      );
    });

    it('sends the get-file command payload from the get file route', async () => {
      await callRoute(GET_FILE_ROUTE, {
        body: { endpoint_ids: ['XYZ'], parameters: { path: '/one/two/three' } },
        version: '2023-10-31',
      });

      expect(
        (await endpointAppContextService.getFleetActionsClient()).create as jest.Mock
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            command: 'get-file',
          }),
        })
      );
    });

    it('sends the `execute` command payload from the execute route', async () => {
      await callRoute(EXECUTE_ROUTE, {
        body: { endpoint_ids: ['XYZ'], parameters: { command: 'ls -al' } },
        version: '2023-10-31',
      });

      expect(
        (await endpointAppContextService.getFleetActionsClient()).create as jest.Mock
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            command: 'execute',
          }),
        })
      );
    });

    it('sends the `scan` command payload from the scan route', async () => {
      await callRoute(SCAN_ROUTE, {
        body: { endpoint_ids: ['XYZ'], parameters: { path: '/home/usr/' } },
        version: '2023-10-31',
      });

      expect(
        (await endpointAppContextService.getFleetActionsClient()).create as jest.Mock
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            command: 'scan',
            parameters: { path: '/home/usr/' },
          }),
        })
      );
    });

    describe('With endpoint data streams', () => {
      it('handles unisolation', async () => {
        const ctx = await callRoute(
          UNISOLATE_HOST_ROUTE_V2,
          {
            body: { endpoint_ids: ['XYZ'] },
            version: '2023-10-31',
          },
          { endpointDsExists: true }
        );

        expect(
          (await endpointAppContextService.getFleetActionsClient()).create as jest.Mock
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              command: 'unisolate',
            }),
          })
        );

        const indexDoc = ctx.core.elasticsearch.client.asInternalUser.index;
        const actionDocs: [{ index: string; document?: LogsEndpointAction }] = [
          indexDoc.mock.calls[0][0] as estypes.IndexRequest<LogsEndpointAction>,
        ];

        expect(actionDocs[0].index).toEqual(ENDPOINT_ACTIONS_INDEX);
        expect(actionDocs[0].document!.EndpointActions.data.command).toEqual('unisolate');

        expect(mockResponse.ok).toBeCalled();
        const responseBody = mockResponse.ok.mock.calls[0][0]?.body as ResponseActionApiResponse;
        expect(responseBody.action).toBeTruthy();
      });

      it('handles isolation', async () => {
        const ctx = await callRoute(
          ISOLATE_HOST_ROUTE_V2,
          {
            body: { endpoint_ids: ['XYZ'] },
            version: '2023-10-31',
          },
          { endpointDsExists: true }
        );

        expect(
          (await endpointAppContextService.getFleetActionsClient()).create as jest.Mock
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              command: 'isolate',
            }),
          })
        );

        const indexDoc = ctx.core.elasticsearch.client.asInternalUser.index;
        const actionDocs: [{ index: string; document?: LogsEndpointAction }] = [
          indexDoc.mock.calls[0][0] as estypes.IndexRequest<LogsEndpointAction>,
        ];

        expect(actionDocs[0].index).toEqual(ENDPOINT_ACTIONS_INDEX);
        expect(actionDocs[0].document!.EndpointActions.data.command).toEqual('isolate');

        expect(mockResponse.ok).toBeCalled();
        const responseBody = mockResponse.ok.mock.calls[0][0]?.body as ResponseActionApiResponse;
        expect(responseBody.action).toBeTruthy();
      });

      it('handles kill-process', async () => {
        const parameters = { entity_id: 1234 };
        const ctx = await callRoute(
          KILL_PROCESS_ROUTE,
          {
            body: { endpoint_ids: ['XYZ'], parameters },
            version: '2023-10-31',
          },
          { endpointDsExists: true }
        );

        expect(
          (await endpointAppContextService.getFleetActionsClient()).create as jest.Mock
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              command: 'kill-process',
              comment: undefined,
              parameters,
            }),
          })
        );

        const indexDoc = ctx.core.elasticsearch.client.asInternalUser.index;
        const actionDocs: [{ index: string; document?: LogsEndpointAction }] = [
          indexDoc.mock.calls[0][0] as estypes.IndexRequest<LogsEndpointAction>,
        ];

        expect(actionDocs[0].index).toEqual(ENDPOINT_ACTIONS_INDEX);
        expect(actionDocs[0].document!.EndpointActions.data.command).toEqual('kill-process');

        expect(mockResponse.ok).toBeCalled();
        const responseBody = mockResponse.ok.mock.calls[0][0]?.body as ResponseActionApiResponse;
        expect(responseBody.action).toBeUndefined();
      });

      it('handles suspend-process', async () => {
        const parameters = { entity_id: 1234 };
        const ctx = await callRoute(
          SUSPEND_PROCESS_ROUTE,
          {
            body: { endpoint_ids: ['XYZ'], parameters },
            version: '2023-10-31',
          },
          { endpointDsExists: true }
        );

        expect(
          (await endpointAppContextService.getFleetActionsClient()).create as jest.Mock
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              command: 'suspend-process',
              comment: undefined,
              parameters,
            }),
          })
        );

        const indexDoc = ctx.core.elasticsearch.client.asInternalUser.index;
        const actionDocs: [{ index: string; document?: LogsEndpointAction }] = [
          indexDoc.mock.calls[0][0] as estypes.IndexRequest<LogsEndpointAction>,
        ];

        expect(actionDocs[0].index).toEqual(ENDPOINT_ACTIONS_INDEX);
        expect(actionDocs[0].document!.EndpointActions.data.command).toEqual('suspend-process');

        expect(mockResponse.ok).toBeCalled();
        const responseBody = mockResponse.ok.mock.calls[0][0]?.body as ResponseActionApiResponse;
        expect(responseBody.action).toBeUndefined();
      });

      it('handles running-processes', async () => {
        const ctx = await callRoute(
          GET_PROCESSES_ROUTE,
          {
            body: { endpoint_ids: ['XYZ'] },
            version: '2023-10-31',
          },
          { endpointDsExists: true }
        );

        expect(
          (await endpointAppContextService.getFleetActionsClient()).create as jest.Mock
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              command: 'running-processes',
            }),
          })
        );

        const indexDoc = ctx.core.elasticsearch.client.asInternalUser.index;
        const actionDocs: [{ index: string; document?: LogsEndpointAction }] = [
          indexDoc.mock.calls[0][0] as estypes.IndexRequest<LogsEndpointAction>,
        ];

        expect(actionDocs[0].index).toEqual(ENDPOINT_ACTIONS_INDEX);
        expect(actionDocs[0].document!.EndpointActions.data.command).toEqual('running-processes');

        expect(mockResponse.ok).toBeCalled();
        const responseBody = mockResponse.ok.mock.calls[0][0]?.body as ResponseActionApiResponse;
        expect(responseBody.action).toBeUndefined();
      });

      it('handles get-file', async () => {
        const ctx = await callRoute(
          GET_FILE_ROUTE,
          {
            body: { endpoint_ids: ['XYZ'], parameters: { path: '/one/two/three' } },
            version: '2023-10-31',
          },
          { endpointDsExists: true }
        );

        expect(
          (await endpointAppContextService.getFleetActionsClient()).create as jest.Mock
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              command: 'get-file',
              comment: undefined,
              parameters: { path: '/one/two/three' },
            }),
          })
        );

        const indexDoc = ctx.core.elasticsearch.client.asInternalUser.index;
        const actionDocs: [{ index: string; document?: LogsEndpointAction }] = [
          indexDoc.mock.calls[0][0] as estypes.IndexRequest<LogsEndpointAction>,
        ];

        expect(actionDocs[0].index).toEqual(ENDPOINT_ACTIONS_INDEX);
        expect(actionDocs[0].document!.EndpointActions.data.command).toEqual('get-file');

        expect(mockResponse.ok).toBeCalled();
        const responseBody = mockResponse.ok.mock.calls[0][0]?.body as ResponseActionApiResponse;
        expect(responseBody.action).toBeUndefined();
      });

      it('handles execute with given `command` and `timeout`', async () => {
        const ctx = await callRoute(
          EXECUTE_ROUTE,
          {
            body: { endpoint_ids: ['XYZ'], parameters: { command: 'ls -al', timeout: 1000 } },
            version: '2023-10-31',
          },
          { endpointDsExists: true }
        );

        expect(
          (await endpointAppContextService.getFleetActionsClient()).create as jest.Mock
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              command: 'execute',
              parameters: expect.objectContaining({
                command: 'ls -al',
                timeout: 1000,
              }),
            }),
          })
        );

        const indexDoc = ctx.core.elasticsearch.client.asInternalUser.index;
        const actionDocs: [{ index: string; document?: LogsEndpointAction }] = [
          indexDoc.mock.calls[0][0] as estypes.IndexRequest<LogsEndpointAction>,
        ];
        expect(actionDocs[0].index).toEqual(ENDPOINT_ACTIONS_INDEX);
        expect(actionDocs[0].document!.EndpointActions.data.command).toEqual('execute');

        expect(mockResponse.ok).toBeCalled();
        const responseBody = mockResponse.ok.mock.calls[0][0]?.body as ResponseActionApiResponse;
        expect(responseBody.action).toBeUndefined();
      });

      it('handles execute without optional `timeout` and sets it to 4 hrs if not given', async () => {
        const ctx = await callRoute(
          EXECUTE_ROUTE,
          {
            body: { endpoint_ids: ['XYZ'], parameters: { command: 'ls -al' } },
            version: '2023-10-31',
          },
          { endpointDsExists: true }
        );

        expect(
          (await endpointAppContextService.getFleetActionsClient()).create as jest.Mock
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              command: 'execute',
              parameters: expect.objectContaining({
                command: 'ls -al',
                timeout: 14400,
              }),
            }),
          })
        );

        // logs-endpoint indexed doc
        const indexDoc = ctx.core.elasticsearch.client.asInternalUser.index;
        const actionDocs: [{ index: string; document?: LogsEndpointAction }] = [
          indexDoc.mock.calls[0][0] as estypes.IndexRequest<LogsEndpointAction>,
        ];

        expect(actionDocs[0].index).toEqual(ENDPOINT_ACTIONS_INDEX);
        expect(actionDocs[0].document!.EndpointActions.data.command).toEqual('execute');

        expect(mockResponse.ok).toBeCalled();
        const responseBody = mockResponse.ok.mock.calls[0][0]?.body as ResponseActionApiResponse;
        expect(responseBody.action).toBeUndefined();
      });

      it('handles scan', async () => {
        const ctx = await callRoute(
          SCAN_ROUTE,
          {
            body: { endpoint_ids: ['XYZ'], parameters: { path: '/home/usr/' } },
            version: '2023-10-31',
          },
          { endpointDsExists: true }
        );

        expect(
          (await endpointAppContextService.getFleetActionsClient()).create as jest.Mock
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              command: 'scan',
              comment: undefined,
              parameters: { path: '/home/usr/' },
            }),
          })
        );

        const indexDoc = ctx.core.elasticsearch.client.asInternalUser.index;
        const actionDocs: [{ index: string; document?: LogsEndpointAction }] = [
          indexDoc.mock.calls[0][0] as estypes.IndexRequest<LogsEndpointAction>,
        ];

        expect(actionDocs[0].index).toEqual(ENDPOINT_ACTIONS_INDEX);
        expect(actionDocs[0].document!.EndpointActions.data.command).toEqual('scan');

        expect(mockResponse.ok).toBeCalled();
        const responseBody = mockResponse.ok.mock.calls[0][0]?.body as ResponseActionApiResponse;
        expect(responseBody.action).toBeUndefined();
      });

      it('signs the action', async () => {
        await callRoute(
          ISOLATE_HOST_ROUTE_V2,
          {
            body: { endpoint_ids: ['XYZ'] },
            version: '2023-10-31',
          },
          { endpointDsExists: true }
        );

        expect(
          (await endpointAppContextService.getFleetActionsClient()).create as jest.Mock
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            signed: {
              data: 'thisisthedata',
              signature: 'thisisasignature',
            },
          })
        );
      });

      it('handles errors', async () => {
        const expectedError = new Error('Uh oh!');
        await callRoute(
          UNISOLATE_HOST_ROUTE_V2,
          {
            body: { endpoint_ids: ['XYZ'] },
            version: '2023-10-31',
            indexErrorResponse: {
              statusCode: 500,
              body: {
                result: expectedError.message,
              },
            },
          },
          { endpointDsExists: true }
        );

        expect(mockResponse.customError).toHaveBeenCalledWith({
          body: expect.any(ResponseActionsClientError),
          statusCode: 500,
        });
      });
    });

    describe('License Level', () => {
      // FIXME: This test also works for downgraded licenses (Gold)
      it('allows platinum license levels to isolate hosts', async () => {
        await callRoute(ISOLATE_HOST_ROUTE_V2, {
          body: { endpoint_ids: ['XYZ'] },
          license: Platinum,
          version: '2023-10-31',
        });
        expect(mockResponse.ok).toBeCalled();
      });

      it('prohibits isolating hosts if no authz for it', async () => {
        await callRoute(ISOLATE_HOST_ROUTE_V2, {
          body: { endpoint_ids: ['XYZ'] },
          authz: { canIsolateHost: false },
          license: Gold,
          version: '2023-10-31',
        });

        expect(mockResponse.forbidden).toBeCalled();
      });

      it('allows any license level to unisolate', async () => {
        licenseEmitter.next(Gold);
        await callRoute(UNISOLATE_HOST_ROUTE_V2, {
          body: { endpoint_ids: ['XYZ'] },
          version: '2023-10-31',
          license: Gold,
        });
        expect(mockResponse.ok).toBeCalled();
      });
    });

    describe('User Authorization Level', () => {
      it('allows user to perform isolation when canIsolateHost is true', async () => {
        await callRoute(ISOLATE_HOST_ROUTE_V2, {
          body: { endpoint_ids: ['XYZ'] },
          version: '2023-10-31',
        });
        expect(mockResponse.ok).toBeCalled();
      });

      it('allows user to perform unisolation when canUnIsolateHost is true', async () => {
        await callRoute(UNISOLATE_HOST_ROUTE_V2, {
          body: { endpoint_ids: ['XYZ'] },
          version: '2023-10-31',
        });
        expect(mockResponse.ok).toBeCalled();
      });

      it('prohibits user from performing isolation if canIsolateHost is false', async () => {
        await callRoute(ISOLATE_HOST_ROUTE_V2, {
          body: { endpoint_ids: ['XYZ'] },
          authz: { canIsolateHost: false },
          version: '2023-10-31',
        });
        expect(mockResponse.forbidden).toBeCalled();
      });

      it('prohibits user from performing un-isolation if canUnIsolateHost is false', async () => {
        await callRoute(UNISOLATE_HOST_ROUTE_V2, {
          body: { endpoint_ids: ['XYZ'] },
          authz: { canUnIsolateHost: false },
          version: '2023-10-31',
        });
        expect(mockResponse.forbidden).toBeCalled();
      });

      it('prohibits user from performing execute action if `canWriteExecuteOperations` is `false`', async () => {
        await callRoute(EXECUTE_ROUTE, {
          body: { endpoint_ids: ['XYZ'] },
          authz: { canWriteExecuteOperations: false },
          version: '2023-10-31',
        });
        expect(mockResponse.forbidden).toBeCalled();
      });

      it('prohibits user from performing `scan` action if `canWriteScanOperations` is `false`', async () => {
        await callRoute(SCAN_ROUTE, {
          body: { endpoint_ids: ['XYZ'] },
          authz: { canWriteScanOperations: false },
          version: '2023-10-31',
        });
        expect(mockResponse.forbidden).toBeCalled();
      });
    });

    describe('Cases', () => {
      let casesClient: CasesClientMock;

      const getCaseIdsFromAttachmentAddService = () => {
        return casesClient.attachments.bulkCreate.mock.calls.map(([addArgs]) => addArgs.caseId);
      };

      beforeEach(async () => {
        casesClient = (await endpointAppContextService.getCasesClient(
          {} as KibanaRequest
        )) as CasesClientMock;

        casesClient.attachments.bulkCreate.mockClear();

        let counter = 1;
        casesClient.cases.getCasesByAlertID.mockImplementation(async () => {
          return [
            {
              id: `case-${counter++}`,
              title: 'case',
              createdAt: '2022-10-31T11:49:48.806Z',
              description: 'a description',
              status: CaseStatuses.open,
              totals: {
                userComments: 1,
                alerts: 1,
              },
            },
          ];
        });
      });

      it('logs a comment to the provided cases', async () => {
        await callRoute(ISOLATE_HOST_ROUTE_V2, {
          body: { endpoint_ids: ['XYZ'], case_ids: ['one', 'two'] },
          version: '2023-10-31',
        });

        expect(casesClient.attachments.bulkCreate).toHaveBeenCalledTimes(2);
        expect(getCaseIdsFromAttachmentAddService()).toEqual(
          expect.arrayContaining(['one', 'two'])
        );
      });

      it('logs a comment to any cases associated with the given alerts', async () => {
        await callRoute(ISOLATE_HOST_ROUTE_V2, {
          body: { endpoint_ids: ['XYZ'], alert_ids: ['one', 'two'] },
          version: '2023-10-31',
        });

        expect(getCaseIdsFromAttachmentAddService()).toEqual(
          expect.arrayContaining(['case-1', 'case-2'])
        );
      });

      it('logs a comment to any cases  provided on input along with cases associated with the given alerts', async () => {
        await callRoute(ISOLATE_HOST_ROUTE_V2, {
          // 'case-1` provided on `case_ids` should be dedupped
          body: {
            endpoint_ids: ['XYZ'],
            case_ids: ['ONE', 'TWO', 'case-1'],
            alert_ids: ['one', 'two'],
          },
          version: '2023-10-31',
        });

        expect(casesClient.attachments.bulkCreate).toHaveBeenCalledTimes(4);
        expect(getCaseIdsFromAttachmentAddService()).toEqual(
          expect.arrayContaining(['ONE', 'TWO', 'case-1', 'case-2'])
        );
      });
    });
  });

  describe('Upload response action handler', () => {
    type UploadHttpApiTestSetupMock = HttpApiTestSetupMock<
      never,
      never,
      UploadActionApiRequestBody
    >;
    type UploadRequestHandler = RequestHandler<
      never,
      never,
      UploadActionApiRequestBody,
      SecuritySolutionRequestHandlerContext
    >;

    let testSetup: UploadHttpApiTestSetupMock;
    let httpRequestMock: ReturnType<UploadHttpApiTestSetupMock['createRequestMock']>;
    let httpHandlerContextMock: UploadHttpApiTestSetupMock['httpHandlerContextMock'];
    let httpResponseMock: UploadHttpApiTestSetupMock['httpResponseMock'];
    let fleetFilesClientMock: jest.Mocked<FleetToHostFileClientInterface>;
    let callHandler: () => ReturnType<UploadRequestHandler>;
    let fileContent: HapiReadableStream;
    let createdUploadAction: ActionDetails;

    beforeEach(async () => {
      testSetup = createHttpApiTestSetupMock<never, never, UploadActionApiRequestBody>();

      ({ httpHandlerContextMock, httpResponseMock } = testSetup);
      httpRequestMock = testSetup.createRequestMock();

      fleetFilesClientMock =
        (await testSetup.endpointAppContextMock.service.getFleetToHostFilesClient()) as jest.Mocked<FleetToHostFileClientInterface>;

      fileContent = createHapiReadableStreamMock();

      const reqBody: UploadActionApiRequestBody = {
        file: fileContent,
        endpoint_ids: ['123-456'],
        parameters: {
          overwrite: true,
        },
      };

      testSetup
        .getEsClientMock('internalUser')
        // @ts-expect-error issue with `index()` method being overloaded
        .index.mockResolvedValue(responseActionsClientMock.createIndexedResponse());

      httpRequestMock = testSetup.createRequestMock({ body: reqBody });
      registerResponseActionRoutes(testSetup.routerMock, testSetup.endpointAppContextMock);

      const actionsGenerator = new EndpointActionGenerator('seed');
      createdUploadAction = actionsGenerator.generateActionDetails({
        command: 'upload',
      });

      (testSetup.endpointAppContextMock.service.getEndpointMetadataService as jest.Mock) = jest
        .fn()
        .mockReturnValue({
          getMetadataForEndpoints: jest.fn().mockResolvedValue([
            {
              elastic: {
                agent: {
                  id: '123-456',
                },
              },
              agent: {
                id: '123-456',
              },
              host: {
                hostname: 'test-host',
              },
            },
          ]),
        });

      const handler = testSetup.getRegisteredVersionedRoute('post', UPLOAD_ROUTE, '2023-10-31')
        .routeHandler as UploadRequestHandler;

      callHandler = () => handler(httpHandlerContextMock, httpRequestMock, httpResponseMock);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should create a file', async () => {
      await callHandler();

      expect(fleetFilesClientMock.create).toHaveBeenCalledWith(fileContent, ['123-456']);
    });

    it('should create the action using parameters with stored file info', async () => {
      await callHandler();

      const createActionMock = testSetup.getEsClientMock();
      expect(createActionMock.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            EndpointActions: expect.objectContaining({
              data: expect.objectContaining({
                parameters: {
                  file_id: '123-456-789',
                  file_name: 'foo.txt',
                  file_sha256: '96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
                  file_size: 45632,
                  overwrite: true,
                },
              }),
            }),
          }),
        }),
        { meta: true }
      );
    });

    it('should delete file if creation of Action fails', async () => {
      testSetup.getEsClientMock('internalUser').index.mockImplementation(async () => {
        throw new CustomHttpRequestError('oh oh');
      });
      await callHandler();

      expect(fleetFilesClientMock.delete).toHaveBeenCalledWith('123-456-789');
    });

    it('should update file with action id', async () => {
      await callHandler();

      expect(fleetFilesClientMock.update).toHaveBeenCalledWith('123-456-789', {
        actionId: '123',
      });
    });

    it('should return expected response on success', async () => {
      getActionDetailsByIdSpy.mockResolvedValue(createdUploadAction);
      await callHandler();

      expect(httpResponseMock.ok).toHaveBeenCalledWith({
        body: {
          data: omit(createdUploadAction, 'action'),
        },
      });
    });
  });

  describe('and `responseActionsSentinelOneV1Enabled` feature flag is enabled', () => {
    let testSetup: HttpApiTestSetupMock;
    let httpRequestMock: ReturnType<HttpApiTestSetupMock['createRequestMock']>;
    let httpHandlerContextMock: HttpApiTestSetupMock['httpHandlerContextMock'];
    let httpResponseMock: HttpApiTestSetupMock['httpResponseMock'];
    let callHandler: () => ReturnType<RequestHandler>;

    beforeEach(async () => {
      testSetup = createHttpApiTestSetupMock();

      ({ httpHandlerContextMock, httpResponseMock } = testSetup);
      httpRequestMock = testSetup.createRequestMock();

      testSetup.endpointAppContextMock.experimentalFeatures = {
        ...testSetup.endpointAppContextMock.experimentalFeatures,
        responseActionsSentinelOneV1Enabled: true,
      };

      httpHandlerContextMock.actions = Promise.resolve({
        getActionsClient: () => sentinelOneMock.createConnectorActionsClient(),
      } as unknown as jest.Mocked<ActionsApiRequestHandlerContext>);

      // Set the esClient to be used in the handler context
      // eslint-disable-next-line require-atomic-updates
      httpHandlerContextMock.core = Promise.resolve(
        set(
          await httpHandlerContextMock.core,
          'elasticsearch.client.asInternalUser',
          responseActionsClientMock.createConstructorOptions().esClient
        )
      );

      httpRequestMock = testSetup.createRequestMock({
        body: {
          endpoint_ids: ['123-456'],
        },
      });
      registerResponseActionRoutes(testSetup.routerMock, testSetup.endpointAppContextMock);

      (testSetup.endpointAppContextMock.service.getEndpointMetadataService as jest.Mock) = jest
        .fn()
        .mockReturnValue({
          getMetadataForEndpoints: jest.fn().mockResolvedValue([
            {
              elastic: {
                agent: {
                  id: '123-456',
                },
              },
              agent: {
                id: '123-456',
              },
              host: {
                hostname: 'test-host',
              },
            },
          ]),
        });

      const handler = testSetup.getRegisteredVersionedRoute(
        'post',
        ISOLATE_HOST_ROUTE_V2,
        '2023-10-31'
      ).routeHandler as RequestHandler;

      callHandler = () => handler(httpHandlerContextMock, httpRequestMock, httpResponseMock);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it.each([
      ['undefined', undefined],
      ['blank value', ''],
      ['endpoint', 'endpoint'],
    ])(
      'should use endpoint response actions client when agentType is: %s',
      async (_, agentTypeValue) => {
        if (agentTypeValue !== undefined) {
          httpRequestMock.body.agent_type = agentTypeValue as ResponseActionAgentType;
        }
        await callHandler();

        expect(getResponseActionsClientMock).toHaveBeenCalledWith('endpoint', expect.anything());
        expect(httpResponseMock.ok).toHaveBeenCalled();
      }
    );

    it('should use SentinelOne response actions client when agent type is sentinel_one', async () => {
      httpRequestMock.body.agent_type = 'sentinel_one';
      await callHandler();

      expect(getResponseActionsClientMock).toHaveBeenCalledWith('sentinel_one', expect.anything());
      expect(httpResponseMock.ok).toHaveBeenCalled();
    });
  });
});
