/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
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
import { parseExperimentalConfigValue } from '../../../../common/experimental_features';
import { SecuritySolutionRequestHandlerContext } from '../../../types';
import { EndpointAppContextService } from '../../endpoint_app_context_services';
import {
  createMockEndpointAppContextServiceSetupContract,
  createMockEndpointAppContextServiceStartContract,
  createRouteHandlerContext,
} from '../../mocks';
import { HostIsolationRequestSchema } from '../../../../common/endpoint/schema/actions';
import { registerHostIsolationRoutes } from './isolation';
import { createMockConfig } from '../../../lib/detection_engine/routes/__mocks__';
import { LicenseService } from '../../../../common/license';
import { Subject } from 'rxjs';
import { ILicense } from '@kbn/licensing-plugin/common/types';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { License } from '@kbn/licensing-plugin/common/license';
import {
  ISOLATE_HOST_ROUTE,
  UNISOLATE_HOST_ROUTE,
  metadataTransformPrefix,
  ENDPOINT_ACTIONS_INDEX,
} from '../../../../common/endpoint/constants';
import {
  EndpointAction,
  HostIsolationRequestBody,
  HostIsolationResponse,
  HostMetadata,
  LogsEndpointAction,
} from '../../../../common/endpoint/types';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import { legacyMetadataSearchResponseMock } from '../metadata/support/test_support';
import { AGENT_ACTIONS_INDEX, ElasticsearchAssetType } from '@kbn/fleet-plugin/common';
import { CasesClientMock } from '@kbn/cases-plugin/server/client/mocks';
import { EndpointAuthz } from '../../../../common/endpoint/types/authz';
import type { PackageClient } from '@kbn/fleet-plugin/server';
import { createMockPackageService } from '@kbn/fleet-plugin/server/mocks';

interface CallRouteInterface {
  body?: HostIsolationRequestBody;
  idxResponse?: any;
  searchResponse?: HostMetadata;
  mockUser?: any;
  license?: License;
  authz?: Partial<EndpointAuthz>;
}

const Platinum = licenseMock.createLicense({ license: { type: 'platinum', mode: 'platinum' } });
const Gold = licenseMock.createLicense({ license: { type: 'gold', mode: 'gold' } });

describe('Host Isolation', () => {
  describe('schema', () => {
    it('should require at least 1 Endpoint ID', () => {
      expect(() => {
        HostIsolationRequestSchema.body.validate({});
      }).toThrow();
    });

    it('should accept an Endpoint ID as the only required field', () => {
      expect(() => {
        HostIsolationRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
        });
      }).not.toThrow();
    });

    it('should accept a comment', () => {
      expect(() => {
        HostIsolationRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          comment: 'a user comment',
        });
      }).not.toThrow();
    });

    it('should accept alert IDs', () => {
      expect(() => {
        HostIsolationRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          alert_ids: ['0000000-000-00'],
        });
      }).not.toThrow();
    });

    it('should accept case IDs', () => {
      expect(() => {
        HostIsolationRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          case_ids: ['000000000-000-000'],
        });
      }).not.toThrow();
    });
  });

  describe('handler', () => {
    let endpointAppContextService: EndpointAppContextService;
    let mockResponse: jest.Mocked<KibanaResponseFactory>;
    let licenseService: LicenseService;
    let licenseEmitter: Subject<ILicense>;

    let callRoute: (
      routePrefix: string,
      opts: CallRouteInterface,
      indexExists?: { endpointDsExists: boolean }
    ) => Promise<jest.Mocked<SecuritySolutionRequestHandlerContext>>;
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
      const mockPackageService = createMockPackageService();
      const mockedPackageClient = mockPackageService.asInternalUser as jest.Mocked<PackageClient>;
      mockedPackageClient.getInstallation.mockResolvedValue({
        installed_kibana: [],
        package_assets: [],
        es_index_patterns: {},
        name: '',
        version: '',
        install_status: 'installed',
        install_version: '',
        install_started_at: '',
        install_source: 'registry',
        installed_es: [
          {
            id: 'logs-endpoint.events.security',
            type: ElasticsearchAssetType.indexTemplate,
          },
          {
            id: `${metadataTransformPrefix}-0.16.0-dev.0`,
            type: ElasticsearchAssetType.transform,
          },
        ],
        keep_policies_up_to_date: false,
      });

      licenseEmitter = new Subject();
      licenseService = new LicenseService();
      licenseService.start(licenseEmitter);

      endpointAppContextService.setup(createMockEndpointAppContextServiceSetupContract());
      endpointAppContextService.start({
        ...startContract,
        licenseService,
        packageService: mockPackageService,
      });

      // add the host isolation route handlers to routerMock
      registerHostIsolationRoutes(routerMock, {
        logFactory: loggingSystemMock.create(),
        service: endpointAppContextService,
        config: () => Promise.resolve(createMockConfig()),
        experimentalFeatures: parseExperimentalConfigValue(createMockConfig().enableExperimental),
      });

      // define a convenience function to execute an API call for a given route, body, and mocked response from ES
      // it returns the requestContext mock used in the call, to assert internal calls (e.g. the indexed document)
      callRoute = async (
        routePrefix: string,
        { body, idxResponse, searchResponse, mockUser, license, authz = {} }: CallRouteInterface,
        indexExists?: { endpointDsExists: boolean }
      ): Promise<jest.Mocked<SecuritySolutionRequestHandlerContext>> => {
        const asUser = mockUser ? mockUser : superUser;
        (startContract.security.authc.getCurrentUser as jest.Mock).mockImplementationOnce(
          () => asUser
        );

        const ctx = createRouteHandlerContext(mockScopedClient, mockSavedObjectClient);

        ctx.securitySolution.endpointAuthz = {
          ...ctx.securitySolution.endpointAuthz,
          ...authz,
        };

        // mock _index_template
        ctx.core.elasticsearch.client.asInternalUser.indices.existsIndexTemplate = jest
          .fn()
          .mockImplementationOnce(() => {
            if (indexExists) {
              return Promise.resolve({
                body: true,
                statusCode: 200,
              });
            }
            return Promise.resolve({
              body: false,
              statusCode: 404,
            });
          });

        const withIdxResp = idxResponse ? idxResponse : { statusCode: 201 };
        const mockIndexResponse = jest.fn().mockImplementation(() => Promise.resolve(withIdxResp));
        const mockSearchResponse = jest
          .fn()
          .mockImplementation(() =>
            Promise.resolve({ body: legacyMetadataSearchResponseMock(searchResponse) })
          );

        ctx.core.elasticsearch.client.asInternalUser.index = mockIndexResponse;
        ctx.core.elasticsearch.client.asCurrentUser.search = mockSearchResponse;

        const withLicense = license ? license : Platinum;
        licenseEmitter.next(withLicense);

        const mockRequest = httpServerMock.createKibanaRequest({ body });
        const [, routeHandler]: [
          RouteConfig<any, any, any, any>,
          RequestHandler<any, any, any, any>
        ] = routerMock.post.mock.calls.find(([{ path }]) => path.startsWith(routePrefix))!;

        await routeHandler(ctx, mockRequest, mockResponse);

        return ctx as unknown as jest.Mocked<SecuritySolutionRequestHandlerContext>;
      };
    });

    afterEach(() => {
      endpointAppContextService.stop();
      licenseService.stop();
      licenseEmitter.complete();
    });
    it('succeeds when an endpoint ID is provided', async () => {
      await callRoute(ISOLATE_HOST_ROUTE, { body: { endpoint_ids: ['XYZ'] } });
      expect(mockResponse.ok).toBeCalled();
    });
    it('reports elasticsearch errors creating an action', async () => {
      const ErrMessage = 'something went wrong?';

      await callRoute(ISOLATE_HOST_ROUTE, {
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
      await callRoute(ISOLATE_HOST_ROUTE, { body: { endpoint_ids: ['XYZ'], comment: 'XYZ' } });
      expect(mockResponse.ok).toBeCalled();
    });
    it('sends the action to the requested agent', async () => {
      const metadataResponse = docGen.generateHostMetadata();
      const AgentID = metadataResponse.elastic.agent.id;
      const ctx = await callRoute(ISOLATE_HOST_ROUTE, {
        body: { endpoint_ids: ['ABC-XYZ-000'] },
        searchResponse: metadataResponse,
      });
      const actionDoc: EndpointAction = (
        ctx.core.elasticsearch.client.asInternalUser.index as jest.Mock
      ).mock.calls[0][0].body;
      expect(actionDoc.agents).toContain(AgentID);
    });
    it('records the user who performed the action to the action record', async () => {
      const testU = { username: 'testuser', roles: ['superuser'] };
      const ctx = await callRoute(ISOLATE_HOST_ROUTE, {
        body: { endpoint_ids: ['XYZ'] },
        mockUser: testU,
      });
      const actionDoc: EndpointAction = (
        ctx.core.elasticsearch.client.asInternalUser.index as jest.Mock
      ).mock.calls[0][0].body;
      expect(actionDoc.user_id).toEqual(testU.username);
    });
    it('records the comment in the action payload', async () => {
      const CommentText = "I am isolating this because it's Friday";
      const ctx = await callRoute(ISOLATE_HOST_ROUTE, {
        body: { endpoint_ids: ['XYZ'], comment: CommentText },
      });
      const actionDoc: EndpointAction = (
        ctx.core.elasticsearch.client.asInternalUser.index as jest.Mock
      ).mock.calls[0][0].body;
      expect(actionDoc.data.comment).toEqual(CommentText);
    });
    it('creates an action and returns its ID', async () => {
      const ctx = await callRoute(ISOLATE_HOST_ROUTE, {
        body: { endpoint_ids: ['XYZ'], comment: 'XYZ' },
      });
      const actionDoc: EndpointAction = (
        ctx.core.elasticsearch.client.asInternalUser.index as jest.Mock
      ).mock.calls[0][0].body;
      const actionID = actionDoc.action_id;
      expect(mockResponse.ok).toBeCalled();
      expect((mockResponse.ok.mock.calls[0][0]?.body as HostIsolationResponse).action).toEqual(
        actionID
      );
    });
    it('records the timeout in the action payload', async () => {
      const ctx = await callRoute(ISOLATE_HOST_ROUTE, {
        body: { endpoint_ids: ['XYZ'] },
      });
      const actionDoc: EndpointAction = (
        ctx.core.elasticsearch.client.asInternalUser.index as jest.Mock
      ).mock.calls[0][0].body;
      expect(actionDoc.timeout).toEqual(300);
    });
    it('sends the action to the correct agent when endpoint ID is given', async () => {
      const doc = docGen.generateHostMetadata();
      const AgentID = doc.elastic.agent.id;

      const ctx = await callRoute(ISOLATE_HOST_ROUTE, {
        body: { endpoint_ids: ['XYZ'] },
        searchResponse: doc,
      });
      const actionDoc: EndpointAction = (
        ctx.core.elasticsearch.client.asInternalUser.index as jest.Mock
      ).mock.calls[0][0].body;
      expect(actionDoc.agents).toContain(AgentID);
    });

    it('sends the isolate command payload from the isolate route', async () => {
      const ctx = await callRoute(ISOLATE_HOST_ROUTE, {
        body: { endpoint_ids: ['XYZ'] },
      });
      const actionDoc: EndpointAction = (
        ctx.core.elasticsearch.client.asInternalUser.index as jest.Mock
      ).mock.calls[0][0].body;
      expect(actionDoc.data.command).toEqual('isolate');
    });
    it('sends the unisolate command payload from the unisolate route', async () => {
      const ctx = await callRoute(UNISOLATE_HOST_ROUTE, {
        body: { endpoint_ids: ['XYZ'] },
      });
      const actionDoc: EndpointAction = (
        ctx.core.elasticsearch.client.asInternalUser.index as jest.Mock
      ).mock.calls[0][0].body;
      expect(actionDoc.data.command).toEqual('unisolate');
    });

    describe('With endpoint data streams', () => {
      it('handles unisolation', async () => {
        const ctx = await callRoute(
          UNISOLATE_HOST_ROUTE,
          {
            body: { endpoint_ids: ['XYZ'] },
          },
          { endpointDsExists: true }
        );

        const indexDoc = ctx.core.elasticsearch.client.asInternalUser.index;
        const actionDocs: [
          { index: string; body: LogsEndpointAction },
          { index: string; body: EndpointAction }
        ] = [(indexDoc as jest.Mock).mock.calls[0][0], (indexDoc as jest.Mock).mock.calls[1][0]];

        expect(actionDocs[0].index).toEqual(ENDPOINT_ACTIONS_INDEX);
        expect(actionDocs[1].index).toEqual(AGENT_ACTIONS_INDEX);
        expect(actionDocs[0].body.EndpointActions.data.command).toEqual('unisolate');
        expect(actionDocs[1].body.data.command).toEqual('unisolate');
      });

      it('handles isolation', async () => {
        const ctx = await callRoute(
          ISOLATE_HOST_ROUTE,
          {
            body: { endpoint_ids: ['XYZ'] },
          },
          { endpointDsExists: true }
        );
        const indexDoc = ctx.core.elasticsearch.client.asInternalUser.index;
        const actionDocs: [
          { index: string; body: LogsEndpointAction },
          { index: string; body: EndpointAction }
        ] = [(indexDoc as jest.Mock).mock.calls[0][0], (indexDoc as jest.Mock).mock.calls[1][0]];

        expect(actionDocs[0].index).toEqual(ENDPOINT_ACTIONS_INDEX);
        expect(actionDocs[1].index).toEqual(AGENT_ACTIONS_INDEX);
        expect(actionDocs[0].body.EndpointActions.data.command).toEqual('isolate');
        expect(actionDocs[1].body.data.command).toEqual('isolate');
      });

      it('handles errors', async () => {
        const ErrMessage = 'Uh oh!';
        await callRoute(
          UNISOLATE_HOST_ROUTE,
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
        await callRoute(ISOLATE_HOST_ROUTE, {
          body: { endpoint_ids: ['XYZ'] },
          license: Platinum,
        });
        expect(mockResponse.ok).toBeCalled();
      });

      it('prohibits isolating hosts if no authz for it', async () => {
        await callRoute(ISOLATE_HOST_ROUTE, {
          body: { endpoint_ids: ['XYZ'] },
          authz: { canIsolateHost: false },
          license: Gold,
        });

        expect(mockResponse.forbidden).toBeCalled();
      });

      it('allows any license level to unisolate', async () => {
        licenseEmitter.next(Gold);
        await callRoute(UNISOLATE_HOST_ROUTE, {
          body: { endpoint_ids: ['XYZ'] },
          license: Gold,
        });
        expect(mockResponse.ok).toBeCalled();
      });
    });

    describe('User Authorization Level', () => {
      it('allows user to perform isolation when canIsolateHost is true', async () => {
        await callRoute(ISOLATE_HOST_ROUTE, {
          body: { endpoint_ids: ['XYZ'] },
        });
        expect(mockResponse.ok).toBeCalled();
      });

      it('allows user to perform unisolation when canUnIsolateHost is true', async () => {
        await callRoute(UNISOLATE_HOST_ROUTE, {
          body: { endpoint_ids: ['XYZ'] },
        });
        expect(mockResponse.ok).toBeCalled();
      });

      it('prohibits user from performing isolation if canIsolateHost is false', async () => {
        await callRoute(ISOLATE_HOST_ROUTE, {
          body: { endpoint_ids: ['XYZ'] },
          authz: { canIsolateHost: false },
        });
        expect(mockResponse.forbidden).toBeCalled();
      });

      it('prohibits user from performing un-isolation if canUnIsolateHost is false', async () => {
        await callRoute(UNISOLATE_HOST_ROUTE, {
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
            },
          ];
        });
      });

      it('logs a comment to the provided cases', async () => {
        await callRoute(ISOLATE_HOST_ROUTE, {
          body: { endpoint_ids: ['XYZ'], case_ids: ['one', 'two'] },
        });

        expect(casesClient.attachments.add).toHaveBeenCalledTimes(2);
        expect(getCaseIdsFromAttachmentAddService()).toEqual(
          expect.arrayContaining(['one', 'two'])
        );
      });

      it('logs a comment to any cases associated with the given alerts', async () => {
        await callRoute(ISOLATE_HOST_ROUTE, {
          body: { endpoint_ids: ['XYZ'], alert_ids: ['one', 'two'] },
        });

        expect(getCaseIdsFromAttachmentAddService()).toEqual(
          expect.arrayContaining(['case-1', 'case-2'])
        );
      });

      it('logs a comment to any cases  provided on input along with cases associated with the given alerts', async () => {
        await callRoute(ISOLATE_HOST_ROUTE, {
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
