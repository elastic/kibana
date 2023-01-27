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
import type {
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandler,
  RouteConfig,
} from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { AGENT_ACTIONS_INDEX } from '@kbn/fleet-plugin/common';
import type { CasesClientMock } from '@kbn/cases-plugin/server/client/mocks';

import { parseExperimentalConfigValue } from '../../../../common/experimental_features';
import { LicenseService } from '../../../../common/license';
import {
  ISOLATE_HOST_ROUTE_V2,
  UNISOLATE_HOST_ROUTE_V2,
  ENDPOINT_ACTIONS_INDEX,
  KILL_PROCESS_ROUTE,
  SUSPEND_PROCESS_ROUTE,
  GET_PROCESSES_ROUTE,
  ISOLATE_HOST_ROUTE,
  UNISOLATE_HOST_ROUTE,
  GET_FILE_ROUTE,
  EXECUTE_ROUTE,
} from '../../../../common/endpoint/constants';
import type {
  ActionDetails,
  EndpointAction,
  ResponseActionApiResponse,
  HostMetadata,
  LogsEndpointAction,
  ResponseActionRequestBody,
  ResponseActionsExecuteParameters,
} from '../../../../common/endpoint/types';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import type { EndpointAuthz } from '../../../../common/endpoint/types/authz';
import { createMockConfig } from '../../../lib/detection_engine/routes/__mocks__';
import type { SecuritySolutionRequestHandlerContextMock } from '../../../lib/detection_engine/routes/__mocks__/request_context';
import { EndpointAppContextService } from '../../endpoint_app_context_services';
import {
  createMockEndpointAppContextServiceSetupContract,
  createMockEndpointAppContextServiceStartContract,
  createRouteHandlerContext,
} from '../../mocks';
import { legacyMetadataSearchResponseMock } from '../metadata/support/test_support';
import { registerResponseActionRoutes } from './response_actions';
import * as ActionDetailsService from '../../services/actions/action_details_by_id';
import { CaseStatuses } from '@kbn/cases-components';
import { getEndpointAuthzInitialStateMock } from '../../../../common/endpoint/service/authz/mocks';

interface CallRouteInterface {
  body?: ResponseActionRequestBody;
  idxResponse?: any;
  searchResponse?: HostMetadata;
  mockUser?: any;
  license?: License;
  authz?: Partial<EndpointAuthz>;
}

const Platinum = licenseMock.createLicense({ license: { type: 'platinum', mode: 'platinum' } });
const Gold = licenseMock.createLicense({ license: { type: 'gold', mode: 'gold' } });

describe('Response actions', () => {
  describe('handler', () => {
    let endpointAppContextService: EndpointAppContextService;
    let mockResponse: jest.Mocked<KibanaResponseFactory>;
    let licenseService: LicenseService;
    let licenseEmitter: Subject<ILicense>;
    let getActionDetailsByIdSpy: jest.SpyInstance;

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

    beforeEach(() => {
      // instantiate... everything
      const mockScopedClient = elasticsearchServiceMock.createScopedClusterClient();
      const mockClusterClient = elasticsearchServiceMock.createClusterClient();
      mockClusterClient.asScoped.mockReturnValue(mockScopedClient);
      const routerMock = httpServiceMock.createRouter();
      mockResponse = httpServerMock.createResponseFactory();
      const startContract = createMockEndpointAppContextServiceStartContract();
      endpointAppContextService = new EndpointAppContextService();
      const mockSavedObjectClient = savedObjectsClientMock.create();

      licenseEmitter = new Subject();
      licenseService = new LicenseService();
      licenseService.start(licenseEmitter);

      endpointAppContextService.setup(createMockEndpointAppContextServiceSetupContract());
      endpointAppContextService.start({
        ...startContract,
        licenseService,
      });

      // add the host isolation route handlers to routerMock
      registerResponseActionRoutes(routerMock, {
        logFactory: loggingSystemMock.create(),
        service: endpointAppContextService,
        config: () => Promise.resolve(createMockConfig()),
        experimentalFeatures: parseExperimentalConfigValue(createMockConfig().enableExperimental),
      });

      getActionDetailsByIdSpy = jest
        .spyOn(ActionDetailsService, 'getActionDetailsById')
        .mockResolvedValue({} as ActionDetails);

      // define a convenience function to execute an API call for a given route, body, and mocked response from ES
      // it returns the requestContext mock used in the call, to assert internal calls (e.g. the indexed document)
      callRoute = async (
        routePrefix: string,
        { body, idxResponse, searchResponse, mockUser, license, authz = {} }: CallRouteInterface,
        indexExists?: { endpointDsExists: boolean }
      ): Promise<AwaitedProperties<SecuritySolutionRequestHandlerContextMock>> => {
        const asUser = mockUser ? mockUser : superUser;
        (startContract.security.authc.getCurrentUser as jest.Mock).mockImplementationOnce(
          () => asUser
        );

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

        const withIdxResp = idxResponse ? idxResponse : { statusCode: 201 };
        ctx.core.elasticsearch.client.asInternalUser.index.mockResponseImplementation(
          () => withIdxResp
        );
        ctx.core.elasticsearch.client.asInternalUser.search.mockResponseImplementation(() => {
          return {
            body: legacyMetadataSearchResponseMock(searchResponse),
          };
        });

        const withLicense = license ? license : Platinum;
        licenseEmitter.next(withLicense);

        const mockRequest = httpServerMock.createKibanaRequest({ body });
        const [, routeHandler]: [
          RouteConfig<any, any, any, any>,
          RequestHandler<any, any, any, any>
        ] = routerMock.post.mock.calls.find(([{ path }]) => path.startsWith(routePrefix))!;

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
      await callRoute(ISOLATE_HOST_ROUTE, { body: { endpoint_ids: ['XYZ'] } });
      expect(mockResponse.custom).toBeCalled();
      const response = mockResponse.custom.mock.calls[0][0];
      expect(response.statusCode).toEqual(308);
      expect(response.headers?.location).toEqual(ISOLATE_HOST_ROUTE_V2);
    });

    it('correctly redirects legacy release to new route', async () => {
      await callRoute(UNISOLATE_HOST_ROUTE, { body: { endpoint_ids: ['XYZ'] } });
      expect(mockResponse.custom).toBeCalled();
      const response = mockResponse.custom.mock.calls[0][0];
      expect(response.statusCode).toEqual(308);
      expect(response.headers?.location).toEqual(UNISOLATE_HOST_ROUTE_V2);
    });

    it('succeeds when an endpoint ID is provided', async () => {
      await callRoute(ISOLATE_HOST_ROUTE_V2, { body: { endpoint_ids: ['XYZ'] } });
      expect(mockResponse.ok).toBeCalled();
    });

    it('reports elasticsearch errors creating an action', async () => {
      const ErrMessage = 'something went wrong?';

      await callRoute(ISOLATE_HOST_ROUTE_V2, {
        body: { endpoint_ids: ['XYZ'] },
        idxResponse: {
          statusCode: 500,
          body: {
            result: ErrMessage,
          },
        },
      });
      expect(mockResponse.ok).not.toBeCalled();
      const response = mockResponse.customError.mock.calls[0][0];
      expect(response.statusCode).toEqual(500);
      expect((response.body as Error).message).toEqual(ErrMessage);
    });

    it('accepts a comment field', async () => {
      await callRoute(ISOLATE_HOST_ROUTE_V2, { body: { endpoint_ids: ['XYZ'], comment: 'XYZ' } });
      expect(mockResponse.ok).toBeCalled();
    });

    it('sends the action to the requested agent', async () => {
      const metadataResponse = docGen.generateHostMetadata();
      const AgentID = metadataResponse.elastic.agent.id;
      const ctx = await callRoute(ISOLATE_HOST_ROUTE_V2, {
        body: { endpoint_ids: ['ABC-XYZ-000'] },
        searchResponse: metadataResponse,
      });
      const actionDoc: EndpointAction = (
        ctx.core.elasticsearch.client.asInternalUser.index.mock
          .calls[0][0] as estypes.IndexRequest<EndpointAction>
      ).body!;
      expect(actionDoc.agents).toContain(AgentID);
    });

    it('records the user who performed the action to the action record', async () => {
      const testU = { username: 'testuser', roles: ['superuser'] };
      const ctx = await callRoute(ISOLATE_HOST_ROUTE_V2, {
        body: { endpoint_ids: ['XYZ'] },
        mockUser: testU,
      });

      const actionDoc: EndpointAction = (
        ctx.core.elasticsearch.client.asInternalUser.index.mock
          .calls[0][0] as estypes.IndexRequest<EndpointAction>
      ).body!;
      expect(actionDoc.user_id).toEqual(testU.username);
    });

    it('records the comment in the action payload', async () => {
      const CommentText = "I am isolating this because it's Friday";
      const ctx = await callRoute(ISOLATE_HOST_ROUTE_V2, {
        body: { endpoint_ids: ['XYZ'], comment: CommentText },
      });
      const actionDoc: EndpointAction = (
        ctx.core.elasticsearch.client.asInternalUser.index.mock
          .calls[0][0] as estypes.IndexRequest<EndpointAction>
      ).body!;
      expect(actionDoc.data.comment).toEqual(CommentText);
    });

    it('creates an action and returns its ID + ActionDetails', async () => {
      const endpointIds = ['XYZ'];
      const actionDetails = { agents: endpointIds, command: 'isolate' } as ActionDetails;
      getActionDetailsByIdSpy.mockResolvedValue(actionDetails);

      const ctx = await callRoute(ISOLATE_HOST_ROUTE_V2, {
        body: { endpoint_ids: endpointIds, comment: 'XYZ' },
      });
      const actionDoc: EndpointAction = (
        ctx.core.elasticsearch.client.asInternalUser.index.mock
          .calls[0][0] as estypes.IndexRequest<EndpointAction>
      ).body!;
      const actionID = actionDoc.action_id;
      expect(mockResponse.ok).toBeCalled();
      expect((mockResponse.ok.mock.calls[0][0]?.body as ResponseActionApiResponse).action).toEqual(
        actionID
      );
      expect(getActionDetailsByIdSpy).toHaveBeenCalledTimes(1);
      expect((mockResponse.ok.mock.calls[0][0]?.body as ResponseActionApiResponse).data).toEqual(
        actionDetails
      );
    });

    it('records the timeout in the action payload', async () => {
      const ctx = await callRoute(ISOLATE_HOST_ROUTE_V2, {
        body: { endpoint_ids: ['XYZ'] },
      });
      const actionDoc: EndpointAction = (
        ctx.core.elasticsearch.client.asInternalUser.index.mock
          .calls[0][0] as estypes.IndexRequest<EndpointAction>
      ).body!;
      expect(actionDoc.timeout).toEqual(300);
    });

    it('sends the action to the correct agent when endpoint ID is given', async () => {
      const doc = docGen.generateHostMetadata();
      const AgentID = doc.elastic.agent.id;

      const ctx = await callRoute(ISOLATE_HOST_ROUTE_V2, {
        body: { endpoint_ids: ['XYZ'] },
        searchResponse: doc,
      });
      const actionDoc: EndpointAction = (
        ctx.core.elasticsearch.client.asInternalUser.index.mock
          .calls[0][0] as estypes.IndexRequest<EndpointAction>
      ).body!;
      expect(actionDoc.agents).toContain(AgentID);
    });

    it('sends the isolate command payload from the isolate route', async () => {
      const ctx = await callRoute(ISOLATE_HOST_ROUTE_V2, {
        body: { endpoint_ids: ['XYZ'] },
      });
      const actionDoc: EndpointAction = (
        ctx.core.elasticsearch.client.asInternalUser.index.mock
          .calls[0][0] as estypes.IndexRequest<EndpointAction>
      ).body!;
      expect(actionDoc.data.command).toEqual('isolate');
    });

    it('sends the unisolate command payload from the unisolate route', async () => {
      const ctx = await callRoute(UNISOLATE_HOST_ROUTE_V2, {
        body: { endpoint_ids: ['XYZ'] },
      });
      const actionDoc: EndpointAction = (
        ctx.core.elasticsearch.client.asInternalUser.index.mock
          .calls[0][0] as estypes.IndexRequest<EndpointAction>
      ).body!;
      expect(actionDoc.data.command).toEqual('unisolate');
    });

    it('sends the kill-process command payload from the kill process route', async () => {
      const ctx = await callRoute(KILL_PROCESS_ROUTE, {
        body: { endpoint_ids: ['XYZ'] },
      });
      const actionDoc: EndpointAction = (
        ctx.core.elasticsearch.client.asInternalUser.index.mock
          .calls[0][0] as estypes.IndexRequest<EndpointAction>
      ).body!;
      expect(actionDoc.data.command).toEqual('kill-process');
    });

    it('sends the suspend-process command payload from the suspend process route', async () => {
      const ctx = await callRoute(SUSPEND_PROCESS_ROUTE, {
        body: { endpoint_ids: ['XYZ'] },
      });
      const actionDoc: EndpointAction = (
        ctx.core.elasticsearch.client.asInternalUser.index.mock
          .calls[0][0] as estypes.IndexRequest<EndpointAction>
      ).body!;
      expect(actionDoc.data.command).toEqual('suspend-process');
    });

    it('sends the running-processes command payload from the running processes route', async () => {
      const ctx = await callRoute(GET_PROCESSES_ROUTE, {
        body: { endpoint_ids: ['XYZ'] },
      });
      const actionDoc: EndpointAction = (
        ctx.core.elasticsearch.client.asInternalUser.index.mock
          .calls[0][0] as estypes.IndexRequest<EndpointAction>
      ).body!;
      expect(actionDoc.data.command).toEqual('running-processes');
    });

    it('sends the get-file command payload from the get file route', async () => {
      const ctx = await callRoute(GET_FILE_ROUTE, {
        body: { endpoint_ids: ['XYZ'], parameters: { path: '/one/two/three' } },
      });
      const actionDoc: EndpointAction = (
        ctx.core.elasticsearch.client.asInternalUser.index.mock
          .calls[0][0] as estypes.IndexRequest<EndpointAction>
      ).body!;
      expect(actionDoc.data.command).toEqual('get-file');
    });

    describe('With endpoint data streams', () => {
      it('handles unisolation', async () => {
        const ctx = await callRoute(
          UNISOLATE_HOST_ROUTE_V2,
          {
            body: { endpoint_ids: ['XYZ'] },
          },
          { endpointDsExists: true }
        );

        const indexDoc = ctx.core.elasticsearch.client.asInternalUser.index;
        const actionDocs: [
          { index: string; body?: LogsEndpointAction },
          { index: string; body?: EndpointAction }
        ] = [
          indexDoc.mock.calls[0][0] as estypes.IndexRequest<LogsEndpointAction>,
          indexDoc.mock.calls[1][0] as estypes.IndexRequest<EndpointAction>,
        ];

        expect(actionDocs[0].index).toEqual(ENDPOINT_ACTIONS_INDEX);
        expect(actionDocs[1].index).toEqual(AGENT_ACTIONS_INDEX);
        expect(actionDocs[0].body!.EndpointActions.data.command).toEqual('unisolate');
        expect(actionDocs[1].body!.data.command).toEqual('unisolate');

        expect(mockResponse.ok).toBeCalled();
        const responseBody = mockResponse.ok.mock.calls[0][0]?.body as ResponseActionApiResponse;
        expect(responseBody.action).toBeTruthy();
      });

      it('handles isolation', async () => {
        const ctx = await callRoute(
          ISOLATE_HOST_ROUTE_V2,
          {
            body: { endpoint_ids: ['XYZ'] },
          },
          { endpointDsExists: true }
        );
        const indexDoc = ctx.core.elasticsearch.client.asInternalUser.index;
        const actionDocs: [
          { index: string; body?: LogsEndpointAction },
          { index: string; body?: EndpointAction }
        ] = [
          indexDoc.mock.calls[0][0] as estypes.IndexRequest<LogsEndpointAction>,
          indexDoc.mock.calls[1][0] as estypes.IndexRequest<EndpointAction>,
        ];

        expect(actionDocs[0].index).toEqual(ENDPOINT_ACTIONS_INDEX);
        expect(actionDocs[1].index).toEqual(AGENT_ACTIONS_INDEX);
        expect(actionDocs[0].body!.EndpointActions.data.command).toEqual('isolate');
        expect(actionDocs[1].body!.data.command).toEqual('isolate');

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
          },
          { endpointDsExists: true }
        );
        const indexDoc = ctx.core.elasticsearch.client.asInternalUser.index;
        const actionDocs: [
          { index: string; body?: LogsEndpointAction },
          { index: string; body?: EndpointAction }
        ] = [
          indexDoc.mock.calls[0][0] as estypes.IndexRequest<LogsEndpointAction>,
          indexDoc.mock.calls[1][0] as estypes.IndexRequest<EndpointAction>,
        ];

        expect(actionDocs[0].index).toEqual(ENDPOINT_ACTIONS_INDEX);
        expect(actionDocs[1].index).toEqual(AGENT_ACTIONS_INDEX);
        expect(actionDocs[0].body!.EndpointActions.data.command).toEqual('kill-process');
        expect(actionDocs[1].body!.data.command).toEqual('kill-process');
        expect(actionDocs[1].body!.data.parameters).toEqual(parameters);

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
          },
          { endpointDsExists: true }
        );
        const indexDoc = ctx.core.elasticsearch.client.asInternalUser.index;
        const actionDocs: [
          { index: string; body?: LogsEndpointAction },
          { index: string; body?: EndpointAction }
        ] = [
          indexDoc.mock.calls[0][0] as estypes.IndexRequest<LogsEndpointAction>,
          indexDoc.mock.calls[1][0] as estypes.IndexRequest<EndpointAction>,
        ];

        expect(actionDocs[0].index).toEqual(ENDPOINT_ACTIONS_INDEX);
        expect(actionDocs[1].index).toEqual(AGENT_ACTIONS_INDEX);
        expect(actionDocs[0].body!.EndpointActions.data.command).toEqual('suspend-process');
        expect(actionDocs[1].body!.data.command).toEqual('suspend-process');
        expect(actionDocs[1].body!.data.parameters).toEqual(parameters);

        expect(mockResponse.ok).toBeCalled();
        const responseBody = mockResponse.ok.mock.calls[0][0]?.body as ResponseActionApiResponse;
        expect(responseBody.action).toBeUndefined();
      });

      it('handles running-processes', async () => {
        const ctx = await callRoute(
          GET_PROCESSES_ROUTE,
          {
            body: { endpoint_ids: ['XYZ'] },
          },
          { endpointDsExists: true }
        );
        const indexDoc = ctx.core.elasticsearch.client.asInternalUser.index;
        const actionDocs: [
          { index: string; body?: LogsEndpointAction },
          { index: string; body?: EndpointAction }
        ] = [
          indexDoc.mock.calls[0][0] as estypes.IndexRequest<LogsEndpointAction>,
          indexDoc.mock.calls[1][0] as estypes.IndexRequest<EndpointAction>,
        ];

        expect(actionDocs[0].index).toEqual(ENDPOINT_ACTIONS_INDEX);
        expect(actionDocs[1].index).toEqual(AGENT_ACTIONS_INDEX);
        expect(actionDocs[0].body!.EndpointActions.data.command).toEqual('running-processes');
        expect(actionDocs[1].body!.data.command).toEqual('running-processes');

        expect(mockResponse.ok).toBeCalled();
        const responseBody = mockResponse.ok.mock.calls[0][0]?.body as ResponseActionApiResponse;
        expect(responseBody.action).toBeUndefined();
      });

      it('handles get-file', async () => {
        const ctx = await callRoute(
          GET_FILE_ROUTE,
          {
            body: { endpoint_ids: ['XYZ'], parameters: { path: '/one/two/three' } },
          },
          { endpointDsExists: true }
        );
        const indexDoc = ctx.core.elasticsearch.client.asInternalUser.index;
        const actionDocs: [
          { index: string; body?: LogsEndpointAction },
          { index: string; body?: EndpointAction }
        ] = [
          indexDoc.mock.calls[0][0] as estypes.IndexRequest<LogsEndpointAction>,
          indexDoc.mock.calls[1][0] as estypes.IndexRequest<EndpointAction>,
        ];

        expect(actionDocs[0].index).toEqual(ENDPOINT_ACTIONS_INDEX);
        expect(actionDocs[1].index).toEqual(AGENT_ACTIONS_INDEX);
        expect(actionDocs[0].body!.EndpointActions.data.command).toEqual('get-file');
        expect(actionDocs[1].body!.data.command).toEqual('get-file');

        expect(mockResponse.ok).toBeCalled();
        const responseBody = mockResponse.ok.mock.calls[0][0]?.body as ResponseActionApiResponse;
        expect(responseBody.action).toBeUndefined();
      });

      it('handles execute', async () => {
        const ctx = await callRoute(
          EXECUTE_ROUTE,
          {
            body: { endpoint_ids: ['XYZ'], parameters: { command: 'ls -al', timeout: 1000 } },
          },
          { endpointDsExists: true }
        );
        const indexDoc = ctx.core.elasticsearch.client.asInternalUser.index;
        const actionDocs: [
          { index: string; body?: LogsEndpointAction },
          { index: string; body?: EndpointAction }
        ] = [
          indexDoc.mock.calls[0][0] as estypes.IndexRequest<LogsEndpointAction>,
          indexDoc.mock.calls[1][0] as estypes.IndexRequest<EndpointAction>,
        ];

        expect(actionDocs[0].index).toEqual(ENDPOINT_ACTIONS_INDEX);
        expect(actionDocs[1].index).toEqual(AGENT_ACTIONS_INDEX);
        expect(actionDocs[0].body!.EndpointActions.data.command).toEqual('execute');
        const parameters = actionDocs[1].body!.data.parameters as ResponseActionsExecuteParameters;
        expect(parameters.command).toEqual('ls -al');
        expect(parameters.timeout).toEqual(1000);
        expect(actionDocs[1].body!.data.command).toEqual('execute');

        expect(mockResponse.ok).toBeCalled();
        const responseBody = mockResponse.ok.mock.calls[0][0]?.body as ResponseActionApiResponse;
        expect(responseBody.action).toBeUndefined();
      });

      it('handles errors', async () => {
        const ErrMessage = 'Uh oh!';
        await callRoute(
          UNISOLATE_HOST_ROUTE_V2,
          {
            body: { endpoint_ids: ['XYZ'] },
            idxResponse: {
              statusCode: 500,
              body: {
                result: ErrMessage,
              },
            },
          },
          { endpointDsExists: true }
        );

        expect(mockResponse.ok).not.toBeCalled();
        const response = mockResponse.customError.mock.calls[0][0];
        expect(response.statusCode).toEqual(500);
        expect((response.body as Error).message).toEqual(ErrMessage);
      });
    });

    describe('License Level', () => {
      it('allows platinum license levels to isolate hosts', async () => {
        await callRoute(ISOLATE_HOST_ROUTE_V2, {
          body: { endpoint_ids: ['XYZ'] },
          license: Platinum,
        });
        expect(mockResponse.ok).toBeCalled();
      });

      it('prohibits isolating hosts if no authz for it', async () => {
        await callRoute(ISOLATE_HOST_ROUTE_V2, {
          body: { endpoint_ids: ['XYZ'] },
          authz: { canIsolateHost: false },
          license: Gold,
        });

        expect(mockResponse.forbidden).toBeCalled();
      });

      it('allows any license level to unisolate', async () => {
        licenseEmitter.next(Gold);
        await callRoute(UNISOLATE_HOST_ROUTE_V2, {
          body: { endpoint_ids: ['XYZ'] },
          license: Gold,
        });
        expect(mockResponse.ok).toBeCalled();
      });
    });

    describe('User Authorization Level', () => {
      it('allows user to perform isolation when canIsolateHost is true', async () => {
        await callRoute(ISOLATE_HOST_ROUTE_V2, {
          body: { endpoint_ids: ['XYZ'] },
        });
        expect(mockResponse.ok).toBeCalled();
      });

      it('allows user to perform unisolation when canUnIsolateHost is true', async () => {
        await callRoute(UNISOLATE_HOST_ROUTE_V2, {
          body: { endpoint_ids: ['XYZ'] },
        });
        expect(mockResponse.ok).toBeCalled();
      });

      it('prohibits user from performing isolation if canIsolateHost is false', async () => {
        await callRoute(ISOLATE_HOST_ROUTE_V2, {
          body: { endpoint_ids: ['XYZ'] },
          authz: { canIsolateHost: false },
        });
        expect(mockResponse.forbidden).toBeCalled();
      });

      it('prohibits user from performing un-isolation if canUnIsolateHost is false', async () => {
        await callRoute(UNISOLATE_HOST_ROUTE_V2, {
          body: { endpoint_ids: ['XYZ'] },
          authz: { canUnIsolateHost: false },
        });
        expect(mockResponse.forbidden).toBeCalled();
      });
    });

    describe('Cases', () => {
      let casesClient: CasesClientMock;

      const getCaseIdsFromAttachmentAddService = () => {
        return casesClient.attachments.add.mock.calls.map(([addArgs]) => addArgs.caseId);
      };

      beforeEach(async () => {
        casesClient = (await endpointAppContextService.getCasesClient(
          {} as KibanaRequest
        )) as CasesClientMock;

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
        });

        expect(casesClient.attachments.add).toHaveBeenCalledTimes(2);
        expect(getCaseIdsFromAttachmentAddService()).toEqual(
          expect.arrayContaining(['one', 'two'])
        );
      });

      it('logs a comment to any cases associated with the given alerts', async () => {
        await callRoute(ISOLATE_HOST_ROUTE_V2, {
          body: { endpoint_ids: ['XYZ'], alert_ids: ['one', 'two'] },
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
        });

        expect(casesClient.attachments.add).toHaveBeenCalledTimes(4);
        expect(getCaseIdsFromAttachmentAddService()).toEqual(
          expect.arrayContaining(['ONE', 'TWO', 'case-1', 'case-2'])
        );
      });
    });
  });
});
