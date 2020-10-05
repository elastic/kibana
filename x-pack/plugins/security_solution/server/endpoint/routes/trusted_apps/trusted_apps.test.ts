/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EndpointAppContextService } from '../../endpoint_app_context_services';
import {
  createMockEndpointAppContext,
  createMockEndpointAppContextServiceStartContract,
} from '../../mocks';
import { IRouter, KibanaRequest, RequestHandler } from 'kibana/server';
import { httpServerMock, httpServiceMock } from '../../../../../../../src/core/server/mocks';
import { registerTrustedAppsRoutes } from './index';
import {
  TRUSTED_APPS_CREATE_API,
  TRUSTED_APPS_DELETE_API,
  TRUSTED_APPS_LIST_API,
} from '../../../../common/endpoint/constants';
import {
  DeleteTrustedAppsRequestParams,
  GetTrustedAppsListRequest,
  PostTrustedAppCreateRequest,
} from '../../../../common/endpoint/types';
import { xpackMocks } from '../../../../../../mocks';
import { ENDPOINT_TRUSTED_APPS_LIST_ID } from '../../../../../lists/common/constants';
import { EndpointAppContext } from '../../types';
import { ExceptionListClient, ListClient } from '../../../../../lists/server';
import { listMock } from '../../../../../lists/server/mocks';
import {
  ExceptionListItemSchema,
  FoundExceptionListItemSchema,
} from '../../../../../lists/common/schemas/response';
import { getExceptionListItemSchemaMock } from '../../../../../lists/common/schemas/response/exception_list_item_schema.mock';

type RequestHandlerContextWithLists = ReturnType<typeof xpackMocks.createRequestHandlerContext> & {
  lists?: {
    getListClient: () => jest.Mocked<ListClient>;
    getExceptionListClient: () => jest.Mocked<ExceptionListClient>;
  };
};

describe('when invoking endpoint trusted apps route handlers', () => {
  let routerMock: jest.Mocked<IRouter>;
  let endpointAppContextService: EndpointAppContextService;
  let context: RequestHandlerContextWithLists;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let exceptionsListClient: jest.Mocked<ExceptionListClient>;
  let endpointAppContext: EndpointAppContext;

  beforeEach(() => {
    routerMock = httpServiceMock.createRouter();
    endpointAppContextService = new EndpointAppContextService();
    const startContract = createMockEndpointAppContextServiceStartContract();
    exceptionsListClient = listMock.getExceptionListClient() as jest.Mocked<ExceptionListClient>;
    endpointAppContextService.start(startContract);
    endpointAppContext = {
      ...createMockEndpointAppContext(),
      service: endpointAppContextService,
    };
    registerTrustedAppsRoutes(routerMock, endpointAppContext);

    // For use in individual API calls
    context = {
      ...xpackMocks.createRequestHandlerContext(),
      lists: {
        getListClient: jest.fn(),
        getExceptionListClient: jest.fn().mockReturnValue(exceptionsListClient),
      },
    };
    response = httpServerMock.createResponseFactory();
  });

  describe('when fetching list of trusted apps', () => {
    let routeHandler: RequestHandler<undefined, GetTrustedAppsListRequest>;
    const createListRequest = (page: number = 1, perPage: number = 20) => {
      return httpServerMock.createKibanaRequest<undefined, GetTrustedAppsListRequest>({
        path: TRUSTED_APPS_LIST_API,
        method: 'get',
        query: {
          page,
          per_page: perPage,
        },
      });
    };

    beforeEach(() => {
      // Get the registered List handler from the IRouter instance
      [, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
        path.startsWith(TRUSTED_APPS_LIST_API)
      )!;
    });

    it('should use ExceptionListClient from route handler context', async () => {
      const request = createListRequest();
      await routeHandler(context, request, response);
      expect(context.lists?.getExceptionListClient).toHaveBeenCalled();
    });

    it('should create the Trusted Apps List first', async () => {
      const request = createListRequest();
      await routeHandler(context, request, response);
      expect(exceptionsListClient.createTrustedAppsList).toHaveBeenCalled();
      expect(response.ok).toHaveBeenCalled();
    });

    it('should pass pagination query params to exception list service', async () => {
      const request = createListRequest(10, 100);
      const emptyResponse = {
        data: [],
        page: 10,
        per_page: 100,
        total: 0,
      };

      exceptionsListClient.findExceptionListItem.mockResolvedValue(emptyResponse);
      await routeHandler(context, request, response);

      expect(response.ok).toHaveBeenCalledWith({ body: emptyResponse });
      expect(exceptionsListClient.findExceptionListItem).toHaveBeenCalledWith({
        listId: ENDPOINT_TRUSTED_APPS_LIST_ID,
        page: 10,
        perPage: 100,
        filter: undefined,
        namespaceType: 'agnostic',
        sortField: 'name',
        sortOrder: 'asc',
      });
    });

    it('should map Exception List Item to Trusted App item', async () => {
      const request = createListRequest(10, 100);
      const emptyResponse: FoundExceptionListItemSchema = {
        data: [
          {
            _version: undefined,
            comments: [],
            created_at: '2020-09-21T19:43:48.240Z',
            created_by: 'test',
            description: '',
            entries: [
              {
                field: 'process.hash.sha256',
                operator: 'included',
                type: 'match',
                value: 'a4370c0cf81686c0b696fa6261c9d3e0d810ae704ab8301839dffd5d5112f476',
              },
              {
                field: 'process.hash.sha1',
                operator: 'included',
                type: 'match',
                value: 'aedb279e378bed6c2db3c9dc9e12ba635e0b391c',
              },
              {
                field: 'process.hash.md5',
                operator: 'included',
                type: 'match',
                value: '741462ab431a22233c787baab9b653c7',
              },
            ],
            id: '1',
            item_id: '11',
            list_id: 'trusted apps test',
            meta: undefined,
            name: 'test',
            namespace_type: 'agnostic',
            os_types: ['windows'],
            tags: [],
            tie_breaker_id: '1',
            type: 'simple',
            updated_at: '2020-09-21T19:43:48.240Z',
            updated_by: 'test',
          },
        ],
        page: 10,
        per_page: 100,
        total: 0,
      };

      exceptionsListClient.findExceptionListItem.mockResolvedValue(emptyResponse);
      await routeHandler(context, request, response);

      expect(response.ok).toHaveBeenCalledWith({
        body: {
          data: [
            {
              created_at: '2020-09-21T19:43:48.240Z',
              created_by: 'test',
              description: '',
              entries: [
                {
                  field: 'process.hash.*',
                  operator: 'included',
                  type: 'match',
                  value: 'a4370c0cf81686c0b696fa6261c9d3e0d810ae704ab8301839dffd5d5112f476',
                },
                {
                  field: 'process.hash.*',
                  operator: 'included',
                  type: 'match',
                  value: 'aedb279e378bed6c2db3c9dc9e12ba635e0b391c',
                },
                {
                  field: 'process.hash.*',
                  operator: 'included',
                  type: 'match',
                  value: '741462ab431a22233c787baab9b653c7',
                },
              ],
              id: '1',
              name: 'test',
              os: 'windows',
            },
          ],
          page: 10,
          per_page: 100,
          total: 0,
        },
      });
    });

    it('should log unexpected error if one occurs', async () => {
      exceptionsListClient.findExceptionListItem.mockImplementation(() => {
        throw new Error('expected error');
      });
      const request = createListRequest(10, 100);
      await routeHandler(context, request, response);
      expect(response.internalError).toHaveBeenCalled();
      expect(endpointAppContext.logFactory.get('trusted_apps').error).toHaveBeenCalled();
    });
  });

  describe('when creating a trusted app', () => {
    let routeHandler: RequestHandler<undefined, PostTrustedAppCreateRequest>;
    const createNewTrustedAppBody = (): {
      -readonly [k in keyof PostTrustedAppCreateRequest]: PostTrustedAppCreateRequest[k];
    } => ({
      name: 'Some Anti-Virus App',
      description: 'this one is ok',
      os: 'windows',
      entries: [
        {
          field: 'process.executable.caseless',
          type: 'match',
          operator: 'included',
          value: 'c:/programs files/Anti-Virus',
        },
      ],
    });
    const createPostRequest = (body?: PostTrustedAppCreateRequest) => {
      return httpServerMock.createKibanaRequest<undefined, PostTrustedAppCreateRequest>({
        path: TRUSTED_APPS_LIST_API,
        method: 'post',
        body: body ?? createNewTrustedAppBody(),
      });
    };

    beforeEach(() => {
      // Get the registered POST handler from the IRouter instance
      [, routeHandler] = routerMock.post.mock.calls.find(([{ path }]) =>
        path.startsWith(TRUSTED_APPS_CREATE_API)
      )!;

      // Mock the impelementation of `createExceptionListItem()` so that the return value
      // merges in the provided input
      exceptionsListClient.createExceptionListItem.mockImplementation(async (newExceptionItem) => {
        return ({
          ...getExceptionListItemSchemaMock(),
          ...newExceptionItem,
          os_types: newExceptionItem.osTypes,
        } as unknown) as ExceptionListItemSchema;
      });
    });

    it('should use ExceptionListClient from route handler context', async () => {
      const request = createPostRequest();
      await routeHandler(context, request, response);
      expect(context.lists?.getExceptionListClient).toHaveBeenCalled();
    });

    it('should create trusted app list first', async () => {
      const request = createPostRequest();
      await routeHandler(context, request, response);
      expect(exceptionsListClient.createTrustedAppsList).toHaveBeenCalled();
      expect(response.ok).toHaveBeenCalled();
    });

    it('should map new trusted app item to an exception list item', async () => {
      const request = createPostRequest();
      await routeHandler(context, request, response);
      expect(exceptionsListClient.createExceptionListItem.mock.calls[0][0]).toEqual({
        comments: [],
        description: 'this one is ok',
        entries: [
          {
            field: 'process.executable.caseless',
            operator: 'included',
            type: 'match',
            value: 'c:/programs files/Anti-Virus',
          },
        ],
        itemId: expect.stringMatching(/.*/),
        listId: 'endpoint_trusted_apps',
        meta: undefined,
        name: 'Some Anti-Virus App',
        namespaceType: 'agnostic',
        osTypes: ['windows'],
        tags: [],
        type: 'simple',
      });
    });

    it('should return new trusted app item', async () => {
      const request = createPostRequest();
      await routeHandler(context, request, response);
      expect(response.ok.mock.calls[0][0]).toEqual({
        body: {
          data: {
            created_at: '2020-04-20T15:25:31.830Z',
            created_by: 'some user',
            description: 'this one is ok',
            entries: [
              {
                field: 'process.executable.caseless',
                operator: 'included',
                type: 'match',
                value: 'c:/programs files/Anti-Virus',
              },
            ],
            id: '1',
            name: 'Some Anti-Virus App',
            os: 'windows',
          },
        },
      });
    });

    it('should log unexpected error if one occurs', async () => {
      exceptionsListClient.createExceptionListItem.mockImplementation(() => {
        throw new Error('expected error for create');
      });
      const request = createPostRequest();
      await routeHandler(context, request, response);
      expect(response.internalError).toHaveBeenCalled();
      expect(endpointAppContext.logFactory.get('trusted_apps').error).toHaveBeenCalled();
    });

    it('should trim trusted app entry name', async () => {
      const newTrustedApp = createNewTrustedAppBody();
      newTrustedApp.name = `\n  ${newTrustedApp.name}  \r\n`;
      const request = createPostRequest(newTrustedApp);
      await routeHandler(context, request, response);
      expect(exceptionsListClient.createExceptionListItem.mock.calls[0][0].name).toEqual(
        'Some Anti-Virus App'
      );
    });

    it('should trim condition entry values', async () => {
      const newTrustedApp = createNewTrustedAppBody();
      newTrustedApp.entries.push({
        field: 'process.executable.caseless',
        value: '\n    some value \r\n ',
        operator: 'included',
        type: 'match',
      });
      const request = createPostRequest(newTrustedApp);
      await routeHandler(context, request, response);
      expect(exceptionsListClient.createExceptionListItem.mock.calls[0][0].entries).toEqual([
        {
          field: 'process.executable.caseless',
          operator: 'included',
          type: 'match',
          value: 'c:/programs files/Anti-Virus',
        },
        {
          field: 'process.executable.caseless',
          value: 'some value',
          operator: 'included',
          type: 'match',
        },
      ]);
    });

    it('should convert hash values to lowercase', async () => {
      const newTrustedApp = createNewTrustedAppBody();
      newTrustedApp.entries.push({
        field: 'process.hash.*',
        value: '741462AB431A22233C787BAAB9B653C7',
        operator: 'included',
        type: 'match',
      });
      const request = createPostRequest(newTrustedApp);
      await routeHandler(context, request, response);
      expect(exceptionsListClient.createExceptionListItem.mock.calls[0][0].entries).toEqual([
        {
          field: 'process.executable.caseless',
          operator: 'included',
          type: 'match',
          value: 'c:/programs files/Anti-Virus',
        },
        {
          field: 'process.hash.md5',
          value: '741462ab431a22233c787baab9b653c7',
          operator: 'included',
          type: 'match',
        },
      ]);
    });

    it('should detect md5 hash', async () => {
      const newTrustedApp = createNewTrustedAppBody();
      newTrustedApp.entries = [
        {
          field: 'process.hash.*',
          value: '741462ab431a22233c787baab9b653c7',
          operator: 'included',
          type: 'match',
        },
      ];
      const request = createPostRequest(newTrustedApp);
      await routeHandler(context, request, response);
      expect(exceptionsListClient.createExceptionListItem.mock.calls[0][0].entries).toEqual([
        {
          field: 'process.hash.md5',
          value: '741462ab431a22233c787baab9b653c7',
          operator: 'included',
          type: 'match',
        },
      ]);
    });

    it('should detect sha1 hash', async () => {
      const newTrustedApp = createNewTrustedAppBody();
      newTrustedApp.entries = [
        {
          field: 'process.hash.*',
          value: 'aedb279e378bed6c2db3c9dc9e12ba635e0b391c',
          operator: 'included',
          type: 'match',
        },
      ];
      const request = createPostRequest(newTrustedApp);
      await routeHandler(context, request, response);
      expect(exceptionsListClient.createExceptionListItem.mock.calls[0][0].entries).toEqual([
        {
          field: 'process.hash.sha1',
          value: 'aedb279e378bed6c2db3c9dc9e12ba635e0b391c',
          operator: 'included',
          type: 'match',
        },
      ]);
    });

    it('should detect sha256 hash', async () => {
      const newTrustedApp = createNewTrustedAppBody();
      newTrustedApp.entries = [
        {
          field: 'process.hash.*',
          value: 'a4370c0cf81686c0b696fa6261c9d3e0d810ae704ab8301839dffd5d5112f476',
          operator: 'included',
          type: 'match',
        },
      ];
      const request = createPostRequest(newTrustedApp);
      await routeHandler(context, request, response);
      expect(exceptionsListClient.createExceptionListItem.mock.calls[0][0].entries).toEqual([
        {
          field: 'process.hash.sha256',
          value: 'a4370c0cf81686c0b696fa6261c9d3e0d810ae704ab8301839dffd5d5112f476',
          operator: 'included',
          type: 'match',
        },
      ]);
    });
  });

  describe('when deleting a trusted app', () => {
    let routeHandler: RequestHandler<DeleteTrustedAppsRequestParams>;
    let request: KibanaRequest<DeleteTrustedAppsRequestParams>;

    beforeEach(() => {
      [, routeHandler] = routerMock.delete.mock.calls.find(([{ path }]) =>
        path.startsWith(TRUSTED_APPS_DELETE_API)
      )!;

      request = httpServerMock.createKibanaRequest<DeleteTrustedAppsRequestParams>({
        path: TRUSTED_APPS_DELETE_API.replace('{id}', '123'),
        method: 'delete',
      });
    });

    it('should use ExceptionListClient from route handler context', async () => {
      await routeHandler(context, request, response);
      expect(context.lists?.getExceptionListClient).toHaveBeenCalled();
    });

    it('should return 200 on successful delete', async () => {
      await routeHandler(context, request, response);
      expect(exceptionsListClient.deleteExceptionListItem).toHaveBeenCalledWith({
        id: request.params.id,
        itemId: undefined,
        namespaceType: 'agnostic',
      });
      expect(response.ok).toHaveBeenCalled();
    });

    it('should return 404 if item does not exist', async () => {
      exceptionsListClient.deleteExceptionListItem.mockResolvedValueOnce(null);
      await routeHandler(context, request, response);
      expect(response.notFound).toHaveBeenCalled();
    });

    it('should log unexpected error if one occurs', async () => {
      exceptionsListClient.deleteExceptionListItem.mockImplementation(() => {
        throw new Error('expected error for delete');
      });
      await routeHandler(context, request, response);
      expect(response.internalError).toHaveBeenCalled();
      expect(endpointAppContext.logFactory.get('trusted_apps').error).toHaveBeenCalled();
    });
  });
});
