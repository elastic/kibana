/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { KibanaResponseFactory, RequestHandler, RouteConfig } from 'kibana/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from 'src/core/server/mocks';
import { parseExperimentalConfigValue } from '../../../../common/experimental_features';
import { SecuritySolutionRequestHandlerContext } from '../../../types';
import { EndpointAppContextService } from '../../endpoint_app_context_services';
import {
  createMockEndpointAppContextServiceStartContract,
  createMockPackageService,
  createRouteHandlerContext,
} from '../../mocks';
import { registerHostIsolationRoutes } from './isolation';
import { createMockConfig } from '../../../lib/detection_engine/routes/__mocks__';
import { LicenseService } from '../../../../common/license';
import { Subject } from 'rxjs';
import { ILicense } from '../../../../../licensing/common/types';
import { licenseMock } from '../../../../../licensing/common/licensing.mock';
import { License } from '../../../../../licensing/common/license';
import {
  ISOLATE_HOST_ROUTE,
  UNISOLATE_HOST_ROUTE,
  metadataTransformPrefix,
} from '../../../../common/endpoint/constants';
import {
  EndpointAction,
  HostIsolationResponse,
  HostMetadata,
} from '../../../../common/endpoint/types';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import { createV2SearchResponse } from '../metadata/support/test_support';
import { ElasticsearchAssetType } from '../../../../../fleet/common';

interface CallRouteInterface {
  body?: any;
  idxResponse?: any;
  searchResponse?: HostMetadata;
  mockUser?: any;
  license?: License;
}

const Platinum = licenseMock.createLicense({ license: { type: 'platinum', mode: 'platinum' } });
const Gold = licenseMock.createLicense({ license: { type: 'gold', mode: 'gold' } });

describe('Host Isolation', () => {
  let endpointAppContextService: EndpointAppContextService;
  let mockResponse: jest.Mocked<KibanaResponseFactory>;
  let licenseService: LicenseService;
  let licenseEmitter: Subject<ILicense>;

  let callRoute: (
    routePrefix: string,
    opts: CallRouteInterface
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
    mockPackageService.getInstalledEsAssetReferences.mockReturnValue(
      Promise.resolve([
        {
          id: 'logs-endpoint.events.security',
          type: ElasticsearchAssetType.indexTemplate,
        },
        {
          id: `${metadataTransformPrefix}-0.16.0-dev.0`,
          type: ElasticsearchAssetType.transform,
        },
      ])
    );
    endpointAppContextService.start({ ...startContract, packageService: mockPackageService });
    licenseEmitter = new Subject();
    licenseService = new LicenseService();
    licenseService.start(licenseEmitter);
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
      { body, idxResponse, searchResponse, mockUser, license }: CallRouteInterface
    ): Promise<jest.Mocked<SecuritySolutionRequestHandlerContext>> => {
      const asUser = mockUser ? mockUser : superUser;
      (startContract.security.authc.getCurrentUser as jest.Mock).mockImplementationOnce(
        () => asUser
      );
      const ctx = createRouteHandlerContext(mockScopedClient, mockSavedObjectClient);
      const withIdxResp = idxResponse ? idxResponse : { statusCode: 201 };
      ctx.core.elasticsearch.client.asCurrentUser.index = jest
        .fn()
        .mockImplementationOnce(() => Promise.resolve(withIdxResp));
      ctx.core.elasticsearch.client.asCurrentUser.search = jest
        .fn()
        .mockImplementationOnce(() =>
          Promise.resolve({ body: createV2SearchResponse(searchResponse) })
        );
      const withLicense = license ? license : Platinum;
      licenseEmitter.next(withLicense);
      const mockRequest = httpServerMock.createKibanaRequest({ body });
      const [, routeHandler]: [
        RouteConfig<any, any, any, any>,
        RequestHandler<any, any, any, any>
      ] = routerMock.post.mock.calls.find(([{ path }]) => path.startsWith(routePrefix))!;
      await routeHandler(ctx, mockRequest, mockResponse);
      return (ctx as unknown) as jest.Mocked<SecuritySolutionRequestHandlerContext>;
    };
  });

  afterEach(() => {
    endpointAppContextService.stop();
    licenseService.stop();
    licenseEmitter.complete();
  });

  it('errors if no endpoint or agent is provided', async () => {
    await callRoute(ISOLATE_HOST_ROUTE, {});
    expect(mockResponse.badRequest).toBeCalled();
  });
  it('succeeds when an agent ID is provided', async () => {
    await callRoute(ISOLATE_HOST_ROUTE, { body: { agent_ids: ['XYZ'] } });
    expect(mockResponse.ok).toBeCalled();
  });
  it('reports elasticsearch errors creating an action', async () => {
    const ErrMessage = 'something went wrong?';

    await callRoute(ISOLATE_HOST_ROUTE, {
      body: { agent_ids: ['XYZ'] },
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
    await callRoute(ISOLATE_HOST_ROUTE, { body: { agent_ids: ['XYZ'], comment: 'XYZ' } });
    expect(mockResponse.ok).toBeCalled();
  });
  it('sends the action to the requested agent', async () => {
    const AgentID = '123-ABC';
    const ctx = await callRoute(ISOLATE_HOST_ROUTE, {
      body: { agent_ids: [AgentID] },
    });
    const actionDoc: EndpointAction = (ctx.core.elasticsearch.client.asCurrentUser
      .index as jest.Mock).mock.calls[0][0].body;
    expect(actionDoc.agents).toContain(AgentID);
  });
  it('records the user who performed the action to the action record', async () => {
    const testU = { username: 'testuser', roles: ['superuser'] };
    const ctx = await callRoute(ISOLATE_HOST_ROUTE, {
      body: { agent_ids: ['XYZ'] },
      mockUser: testU,
    });
    const actionDoc: EndpointAction = (ctx.core.elasticsearch.client.asCurrentUser
      .index as jest.Mock).mock.calls[0][0].body;
    expect(actionDoc.user_id).toEqual(testU.username);
  });
  it('records the comment in the action payload', async () => {
    const CommentText = "I am isolating this because it's Friday";
    const ctx = await callRoute(ISOLATE_HOST_ROUTE, {
      body: { agent_ids: ['XYZ'], comment: CommentText },
    });
    const actionDoc: EndpointAction = (ctx.core.elasticsearch.client.asCurrentUser
      .index as jest.Mock).mock.calls[0][0].body;
    expect(actionDoc.data.comment).toEqual(CommentText);
  });
  it('creates an action and returns its ID', async () => {
    const ctx = await callRoute(ISOLATE_HOST_ROUTE, {
      body: { agent_ids: ['XYZ'], comment: 'XYZ' },
    });
    const actionDoc: EndpointAction = (ctx.core.elasticsearch.client.asCurrentUser
      .index as jest.Mock).mock.calls[0][0].body;
    const actionID = actionDoc.action_id;
    expect(mockResponse.ok).toBeCalled();
    expect((mockResponse.ok.mock.calls[0][0]?.body as HostIsolationResponse).action).toEqual(
      actionID
    );
  });

  it('succeeds when just an endpoint ID is provided', async () => {
    await callRoute(ISOLATE_HOST_ROUTE, { body: { endpoint_ids: ['XYZ'] } });
    expect(mockResponse.ok).toBeCalled();
  });
  it('sends the action to the correct agent when endpoint ID is given', async () => {
    const doc = docGen.generateHostMetadata();
    const AgentID = doc.elastic.agent.id;

    const ctx = await callRoute(ISOLATE_HOST_ROUTE, {
      body: { endpoint_ids: ['XYZ'] },
      searchResponse: doc,
    });
    const actionDoc: EndpointAction = (ctx.core.elasticsearch.client.asCurrentUser
      .index as jest.Mock).mock.calls[0][0].body;
    expect(actionDoc.agents).toContain(AgentID);
  });
  it('combines given agent IDs and endpoint IDs', async () => {
    const doc = docGen.generateHostMetadata();
    const explicitAgentID = 'XYZ';
    const lookupAgentID = doc.elastic.agent.id;

    const ctx = await callRoute(ISOLATE_HOST_ROUTE, {
      body: { agent_ids: [explicitAgentID], endpoint_ids: ['XYZ'] },
      searchResponse: doc,
    });
    const actionDoc: EndpointAction = (ctx.core.elasticsearch.client.asCurrentUser
      .index as jest.Mock).mock.calls[0][0].body;
    expect(actionDoc.agents).toContain(explicitAgentID);
    expect(actionDoc.agents).toContain(lookupAgentID);
  });

  it('sends the isolate command payload from the isolate route', async () => {
    const ctx = await callRoute(ISOLATE_HOST_ROUTE, {
      body: { agent_ids: ['XYZ'] },
    });
    const actionDoc: EndpointAction = (ctx.core.elasticsearch.client.asCurrentUser
      .index as jest.Mock).mock.calls[0][0].body;
    expect(actionDoc.data.command).toEqual('isolate');
  });
  it('sends the unisolate command payload from the unisolate route', async () => {
    const ctx = await callRoute(UNISOLATE_HOST_ROUTE, {
      body: { agent_ids: ['XYZ'] },
    });
    const actionDoc: EndpointAction = (ctx.core.elasticsearch.client.asCurrentUser
      .index as jest.Mock).mock.calls[0][0].body;
    expect(actionDoc.data.command).toEqual('unisolate');
  });

  describe('License Level', () => {
    it('allows platinum license levels to isolate hosts', async () => {
      await callRoute(ISOLATE_HOST_ROUTE, {
        body: { agent_ids: ['XYZ'] },
        license: Platinum,
      });
      expect(mockResponse.ok).toBeCalled();
    });
    it('prohibits license levels less than platinum from isolating hosts', async () => {
      licenseEmitter.next(Gold);
      await callRoute(ISOLATE_HOST_ROUTE, {
        body: { agent_ids: ['XYZ'] },
        license: Gold,
      });
      expect(mockResponse.forbidden).toBeCalled();
    });
    it('allows any license level to unisolate', async () => {
      licenseEmitter.next(Gold);
      await callRoute(UNISOLATE_HOST_ROUTE, {
        body: { agent_ids: ['XYZ'] },
        license: Gold,
      });
      expect(mockResponse.ok).toBeCalled();
    });
  });

  describe('User Level', () => {
    it('allows superuser to perform isolation', async () => {
      const superU = { username: 'foo', roles: ['superuser'] };
      await callRoute(ISOLATE_HOST_ROUTE, {
        body: { agent_ids: ['XYZ'] },
        mockUser: superU,
      });
      expect(mockResponse.ok).toBeCalled();
    });
    it('allows superuser to perform unisolation', async () => {
      const superU = { username: 'foo', roles: ['superuser'] };
      await callRoute(UNISOLATE_HOST_ROUTE, {
        body: { agent_ids: ['XYZ'] },
        mockUser: superU,
      });
      expect(mockResponse.ok).toBeCalled();
    });

    it('prohibits non-admin user from performing isolation', async () => {
      const superU = { username: 'foo', roles: ['user'] };
      await callRoute(ISOLATE_HOST_ROUTE, {
        body: { agent_ids: ['XYZ'] },
        mockUser: superU,
      });
      expect(mockResponse.forbidden).toBeCalled();
    });
    it('prohibits non-admin user from performing unisolation', async () => {
      const superU = { username: 'foo', roles: ['user'] };
      await callRoute(UNISOLATE_HOST_ROUTE, {
        body: { agent_ids: ['XYZ'] },
        mockUser: superU,
      });
      expect(mockResponse.forbidden).toBeCalled();
    });
  });

  describe('Cases', () => {
    it.todo('logs a comment to the provided case');
    it.todo('logs a comment to any cases associated with the given alert');
  });
});
