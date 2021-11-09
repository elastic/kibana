/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaResponseFactory } from 'kibana/server';
import { Subject } from 'rxjs';

import { xpackMocks } from '../../../fixtures';
import { loggingSystemMock, httpServerMock } from '../../../../../../../src/core/server/mocks';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { listMock } from '../../../../../lists/server/mocks';
import { ExceptionListClient } from '../../../../../lists/server';
import { createMockConfig } from '../../../lib/detection_engine/routes/__mocks__';

import {
  ConditionEntryField,
  NewTrustedApp,
  OperatingSystem,
  TrustedApp,
} from '../../../../common/endpoint/types';
import { LicenseService } from '../../../../common/license';
import { ILicense } from '../../../../../licensing/common/types';
import { licenseMock } from '../../../../../licensing/common/licensing.mock';
import { parseExperimentalConfigValue } from '../../../../common/experimental_features';
import { EndpointAppContextService } from '../../endpoint_app_context_services';
import { createConditionEntry, createEntryMatch } from './mapping';
import {
  getTrustedAppsCreateRouteHandler,
  getTrustedAppsDeleteRouteHandler,
  getTrustedAppsGetOneHandler,
  getTrustedAppsListRouteHandler,
  getTrustedAppsSummaryRouteHandler,
  getTrustedAppsUpdateRouteHandler,
} from './handlers';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';
import {
  TrustedAppNotFoundError,
  TrustedAppVersionConflictError,
  TrustedAppPolicyNotExistsError,
} from './errors';
import { updateExceptionListItemImplementationMock } from './test_utils';
import { Logger } from '@kbn/logging';
import { PackagePolicyServiceInterface } from '../../../../../fleet/server';
import { createPackagePolicyServiceMock } from '../../../../../fleet/server/mocks';
import {
  getPackagePoliciesResponse,
  getPutTrustedAppByPolicyMock,
  getTrustedAppByPolicy,
} from './mocks';
import { EndpointLicenseError } from '../../errors';

const EXCEPTION_LIST_ITEM: ExceptionListItemSchema = {
  _version: 'abc123',
  id: '123',
  comments: [],
  created_at: '11/11/2011T11:11:11.111',
  created_by: 'admin',
  description: 'Linux trusted app 1',
  entries: [
    createEntryMatch('process.executable.caseless', '/bin/malware'),
    createEntryMatch('process.hash.md5', '1234234659af249ddf3e40864e9fb241'),
  ],
  item_id: '123',
  list_id: 'endpoint_trusted_apps',
  meta: undefined,
  name: 'linux trusted app 1',
  namespace_type: 'agnostic',
  os_types: ['linux'],
  tags: ['policy:all'],
  type: 'simple',
  tie_breaker_id: '123',
  updated_at: '2021-01-04T13:55:00.561Z',
  updated_by: 'me',
};

const NEW_TRUSTED_APP: NewTrustedApp = {
  name: 'linux trusted app 1',
  description: 'Linux trusted app 1',
  os: OperatingSystem.LINUX,
  effectScope: { type: 'global' },
  entries: [
    createConditionEntry(ConditionEntryField.PATH, 'match', '/bin/malware'),
    createConditionEntry(ConditionEntryField.HASH, 'match', '1234234659af249ddf3e40864e9fb241'),
  ],
};

const TRUSTED_APP: TrustedApp = {
  id: '123',
  version: 'abc123',
  created_at: '11/11/2011T11:11:11.111',
  created_by: 'admin',
  updated_at: '2021-01-04T13:55:00.561Z',
  updated_by: 'me',
  name: 'linux trusted app 1',
  description: 'Linux trusted app 1',
  os: OperatingSystem.LINUX,
  effectScope: { type: 'global' },
  entries: [
    createConditionEntry(ConditionEntryField.HASH, 'match', '1234234659af249ddf3e40864e9fb241'),
    createConditionEntry(ConditionEntryField.PATH, 'match', '/bin/malware'),
  ],
};

const Platinum = licenseMock.createLicense({ license: { type: 'platinum', mode: 'platinum' } });
const Gold = licenseMock.createLicense({ license: { type: 'gold', mode: 'gold' } });

const packagePolicyClient =
  createPackagePolicyServiceMock() as jest.Mocked<PackagePolicyServiceInterface>;

describe('TrustedApps API Handlers', () => {
  beforeEach(() => {
    packagePolicyClient.getByIDs.mockReset();
  });
  const licenseEmitter: Subject<ILicense> = new Subject();
  const licenseService = new LicenseService();
  licenseService.start(licenseEmitter);

  const createAppContextMock = () => {
    const context = {
      logFactory: loggingSystemMock.create(),
      service: new EndpointAppContextService(),
      config: () => Promise.resolve(createMockConfig()),
      experimentalFeatures: parseExperimentalConfigValue(createMockConfig().enableExperimental),
    };

    context.service.getPackagePolicyService = () => packagePolicyClient;
    context.service.getLicenseService = () => licenseService;

    // Ensure that `logFactory.get()` always returns the same instance for the same given prefix
    const instances = new Map<string, ReturnType<typeof context.logFactory.get>>();
    const logFactoryGetMock = context.logFactory.get.getMockImplementation();
    context.logFactory.get.mockImplementation((prefix): Logger => {
      if (!instances.has(prefix)) {
        instances.set(prefix, logFactoryGetMock!(prefix)!);
      }
      return instances.get(prefix)!;
    });

    return context;
  };

  let appContextMock: ReturnType<typeof createAppContextMock> = createAppContextMock();
  let exceptionsListClient: jest.Mocked<ExceptionListClient> =
    listMock.getExceptionListClient() as jest.Mocked<ExceptionListClient>;

  const createHandlerContextMock = () =>
    ({
      ...xpackMocks.createRequestHandlerContext(),
      lists: {
        getListClient: jest.fn(),
        getExceptionListClient: jest.fn().mockReturnValue(exceptionsListClient),
      },
    } as unknown as jest.Mocked<SecuritySolutionRequestHandlerContext>);

  const assertResponse = <T>(
    response: jest.Mocked<KibanaResponseFactory>,
    expectedResponseType: keyof KibanaResponseFactory,
    expectedResponseBody: T
  ) => {
    expect(response[expectedResponseType]).toBeCalled();
    expect(response[expectedResponseType].mock.calls[0][0]?.body).toEqual(expectedResponseBody);
  };

  beforeEach(() => {
    appContextMock = createAppContextMock();
    exceptionsListClient = listMock.getExceptionListClient() as jest.Mocked<ExceptionListClient>;
    licenseEmitter.next(Platinum);
  });

  describe('getTrustedAppsDeleteRouteHandler', () => {
    let deleteTrustedAppHandler: ReturnType<typeof getTrustedAppsDeleteRouteHandler>;

    beforeEach(() => {
      deleteTrustedAppHandler = getTrustedAppsDeleteRouteHandler(appContextMock);
    });

    it('should return ok when trusted app deleted', async () => {
      const mockResponse = httpServerMock.createResponseFactory();

      exceptionsListClient.deleteExceptionListItem.mockResolvedValue(EXCEPTION_LIST_ITEM);

      await deleteTrustedAppHandler(
        createHandlerContextMock(),
        httpServerMock.createKibanaRequest({ params: { id: '123' } }),
        mockResponse
      );

      assertResponse(mockResponse, 'ok', undefined);
    });

    it('should return notFound when trusted app missing', async () => {
      const mockResponse = httpServerMock.createResponseFactory();

      exceptionsListClient.deleteExceptionListItem.mockResolvedValue(null);
      exceptionsListClient.getExceptionListItem.mockResolvedValue(null);

      await deleteTrustedAppHandler(
        createHandlerContextMock(),
        httpServerMock.createKibanaRequest({ params: { id: '123' } }),
        mockResponse
      );

      assertResponse(mockResponse, 'notFound', new TrustedAppNotFoundError('123'));
    });

    it('should return internalError when errors happen', async () => {
      const mockResponse = httpServerMock.createResponseFactory();
      const error = new Error('Something went wrong');

      exceptionsListClient.deleteExceptionListItem.mockRejectedValue(error);

      await expect(
        deleteTrustedAppHandler(
          createHandlerContextMock(),
          httpServerMock.createKibanaRequest({ params: { id: '123' } }),
          mockResponse
        )
      ).rejects.toThrowError(error);
    });
  });

  describe('getTrustedAppsCreateRouteHandler', () => {
    let createTrustedAppHandler: ReturnType<typeof getTrustedAppsCreateRouteHandler>;

    beforeEach(() => {
      createTrustedAppHandler = getTrustedAppsCreateRouteHandler(appContextMock);
    });

    it('should return ok with body when trusted app created', async () => {
      const mockResponse = httpServerMock.createResponseFactory();

      exceptionsListClient.createExceptionListItem.mockResolvedValue(EXCEPTION_LIST_ITEM);

      await createTrustedAppHandler(
        createHandlerContextMock(),
        httpServerMock.createKibanaRequest({ body: NEW_TRUSTED_APP }),
        mockResponse
      );

      assertResponse(mockResponse, 'ok', { data: TRUSTED_APP });
    });

    it('should return internalError when errors happen', async () => {
      const mockResponse = httpServerMock.createResponseFactory();
      const error = new Error('Something went wrong');

      exceptionsListClient.createExceptionListItem.mockRejectedValue(error);

      await expect(
        createTrustedAppHandler(
          createHandlerContextMock(),
          httpServerMock.createKibanaRequest({ body: NEW_TRUSTED_APP }),
          mockResponse
        )
      ).rejects.toThrowError(error);
    });

    it("should return error when policy doesn't exists", async () => {
      const mockResponse = httpServerMock.createResponseFactory();
      packagePolicyClient.getByIDs.mockReset();
      packagePolicyClient.getByIDs.mockResolvedValueOnce(getPackagePoliciesResponse());

      const trustedAppByPolicy = getTrustedAppByPolicy();
      await createTrustedAppHandler(
        createHandlerContextMock(),
        httpServerMock.createKibanaRequest({ body: trustedAppByPolicy }),
        mockResponse
      );

      const error = new TrustedAppPolicyNotExistsError(trustedAppByPolicy.name, [
        '9da95be9-9bee-4761-a8c4-28d6d9bd8c71',
      ]);

      expect(appContextMock.logFactory.get('trusted_apps').error).toHaveBeenCalledWith(error);
      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: { message: error.message, attributes: { type: error.type } },
      });
    });

    it('should return error when license under platinum and by policy', async () => {
      licenseEmitter.next(Gold);
      const mockResponse = httpServerMock.createResponseFactory();
      packagePolicyClient.getByIDs.mockReset();
      packagePolicyClient.getByIDs.mockResolvedValueOnce(getPackagePoliciesResponse());

      const trustedAppByPolicy = getTrustedAppByPolicy();
      await createTrustedAppHandler(
        createHandlerContextMock(),
        httpServerMock.createKibanaRequest({ body: trustedAppByPolicy }),
        mockResponse
      );

      const error = new EndpointLicenseError();

      expect(appContextMock.logFactory.get('trusted_apps').error).toHaveBeenCalledWith(error);
      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: { message: error.message, attributes: { type: error.name } },
      });
    });
  });

  describe('getTrustedAppsListRouteHandler', () => {
    let getTrustedAppsListHandler: ReturnType<typeof getTrustedAppsListRouteHandler>;

    beforeEach(() => {
      getTrustedAppsListHandler = getTrustedAppsListRouteHandler(appContextMock);
    });

    it('should return ok with list when no errors', async () => {
      const mockResponse = httpServerMock.createResponseFactory();

      exceptionsListClient.findExceptionListItem.mockResolvedValue({
        data: [EXCEPTION_LIST_ITEM],
        page: 1,
        per_page: 20,
        total: 100,
      });

      await getTrustedAppsListHandler(
        createHandlerContextMock(),
        httpServerMock.createKibanaRequest({ query: { page: 1, per_page: 20 } }),
        mockResponse
      );

      assertResponse(mockResponse, 'ok', {
        data: [TRUSTED_APP],
        page: 1,
        per_page: 20,
        total: 100,
      });
    });

    it('should return internalError when errors happen', async () => {
      const mockResponse = httpServerMock.createResponseFactory();
      const error = new Error('Something went wrong');

      exceptionsListClient.findExceptionListItem.mockRejectedValue(error);

      await expect(
        getTrustedAppsListHandler(
          createHandlerContextMock(),
          httpServerMock.createKibanaRequest({ body: NEW_TRUSTED_APP }),
          mockResponse
        )
      ).rejects.toThrowError(error);
    });

    it('should pass all params to the service', async () => {
      const mockResponse = httpServerMock.createResponseFactory();

      exceptionsListClient.findExceptionListItem.mockResolvedValue({
        data: [EXCEPTION_LIST_ITEM],
        page: 5,
        per_page: 13,
        total: 100,
      });

      const requestContext = createHandlerContextMock();

      await getTrustedAppsListHandler(
        requestContext,
        httpServerMock.createKibanaRequest({
          query: { page: 5, per_page: 13, kuery: 'some-param.key: value' },
        }),
        mockResponse
      );

      expect(exceptionsListClient.findExceptionListItem).toHaveBeenCalledWith(
        expect.objectContaining({ filter: 'some-param.key: value', page: 5, perPage: 13 })
      );
    });
  });

  describe('getTrustedAppsSummaryHandler', () => {
    let getTrustedAppsSummaryHandler: ReturnType<typeof getTrustedAppsSummaryRouteHandler>;
    const getExceptionsListClientMokcResolvedValue = () => {
      exceptionsListClient.findExceptionListItem.mockResolvedValue({
        data: [
          // Linux === 5
          ...Array.from({ length: 5 }, () => {
            return {
              ...EXCEPTION_LIST_ITEM,
            };
          }),
          // macos === 3
          ...Array.from({ length: 3 }, () => {
            return {
              ...EXCEPTION_LIST_ITEM,
              os_types: ['macos'] as ExceptionListItemSchema['os_types'],
            };
          }),

          // windows === 15
          ...Array.from({ length: 15 }, () => {
            return {
              ...EXCEPTION_LIST_ITEM,
              os_types: ['windows'] as ExceptionListItemSchema['os_types'],
            };
          }),
        ],
        page: 1,
        per_page: 100,
        total: 23,
      });
    };

    beforeEach(() => {
      getTrustedAppsSummaryHandler = getTrustedAppsSummaryRouteHandler(appContextMock);
    });

    it('should return ok with list when no errors', async () => {
      const mockResponse = httpServerMock.createResponseFactory();

      getExceptionsListClientMokcResolvedValue();

      await getTrustedAppsSummaryHandler(
        createHandlerContextMock(),
        httpServerMock.createKibanaRequest(),
        mockResponse
      );

      assertResponse(mockResponse, 'ok', {
        linux: 5,
        macos: 3,
        windows: 15,
        total: 23,
      });
    });

    it('should return ok with list when no errors filtering by policyId', async () => {
      const mockResponse = httpServerMock.createResponseFactory();

      const policyId = 'caf1a334-53f3-4be9-814d-a32245f43d34';

      getExceptionsListClientMokcResolvedValue();

      await getTrustedAppsSummaryHandler(
        createHandlerContextMock(),
        httpServerMock.createKibanaRequest({
          query: {
            kuery: `exception-list-agnostic.attributes.tags:"policy:${policyId}" OR exception-list-agnostic.attributes.tags:"policy:all"`,
          },
        }),
        mockResponse
      );

      assertResponse(mockResponse, 'ok', {
        linux: 5,
        macos: 3,
        windows: 15,
        total: 23,
      });
    });

    it('should return internalError when errors happen', async () => {
      const mockResponse = httpServerMock.createResponseFactory();
      const error = new Error('Something went wrong');

      exceptionsListClient.findExceptionListItem.mockRejectedValue(error);

      await expect(
        getTrustedAppsSummaryHandler(
          createHandlerContextMock(),
          httpServerMock.createKibanaRequest(),
          mockResponse
        )
      ).rejects.toThrowError(error);
    });
  });

  describe('getTrustedAppsGetOneHandler', () => {
    let getOneHandler: ReturnType<typeof getTrustedAppsGetOneHandler>;

    beforeEach(() => {
      getOneHandler = getTrustedAppsGetOneHandler(appContextMock);
    });

    it('should return single trusted app', async () => {
      const mockResponse = httpServerMock.createResponseFactory();

      exceptionsListClient.getExceptionListItem.mockResolvedValue(EXCEPTION_LIST_ITEM);

      await getOneHandler(
        createHandlerContextMock(),
        httpServerMock.createKibanaRequest({ query: { page: 1, per_page: 20 } }),
        mockResponse
      );

      assertResponse(mockResponse, 'ok', {
        data: TRUSTED_APP,
      });
    });

    it('should return 404 if trusted app does not exist', async () => {
      const mockResponse = httpServerMock.createResponseFactory();

      exceptionsListClient.getExceptionListItem.mockResolvedValue(null);

      await getOneHandler(
        createHandlerContextMock(),
        httpServerMock.createKibanaRequest({ query: { page: 1, per_page: 20 } }),
        mockResponse
      );

      assertResponse(mockResponse, 'notFound', expect.any(TrustedAppNotFoundError));
    });

    it.each([
      [new TrustedAppNotFoundError('123')],
      [new TrustedAppVersionConflictError('123', new Error('some conflict error'))],
    ])('should log error: %s', async (error) => {
      const mockResponse = httpServerMock.createResponseFactory();
      exceptionsListClient.getExceptionListItem.mockImplementation(async () => {
        throw error;
      });

      await getOneHandler(
        createHandlerContextMock(),
        httpServerMock.createKibanaRequest({ query: { page: 1, per_page: 20 } }),
        mockResponse
      );

      expect(appContextMock.logFactory.get('trusted_apps').error).toHaveBeenCalledWith(error);
    });
  });

  describe('getTrustedAppsUpdateRouteHandler', () => {
    let updateHandler: ReturnType<typeof getTrustedAppsUpdateRouteHandler>;
    let mockResponse: ReturnType<typeof httpServerMock.createResponseFactory>;

    beforeEach(() => {
      updateHandler = getTrustedAppsUpdateRouteHandler(appContextMock);
      mockResponse = httpServerMock.createResponseFactory();
    });

    it('should return success with updated trusted app', async () => {
      exceptionsListClient.getExceptionListItem.mockResolvedValue(EXCEPTION_LIST_ITEM);
      exceptionsListClient.updateExceptionListItem.mockImplementationOnce(
        updateExceptionListItemImplementationMock
      );

      await updateHandler(
        createHandlerContextMock(),
        httpServerMock.createKibanaRequest({ params: { id: '123' }, body: NEW_TRUSTED_APP }),
        mockResponse
      );

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          data: {
            created_at: '11/11/2011T11:11:11.111',
            created_by: 'admin',
            updated_at: '11/11/2011T11:11:11.111',
            updated_by: 'admin',
            description: 'Linux trusted app 1',
            effectScope: {
              type: 'global',
            },
            entries: [
              {
                field: 'process.hash.*',
                operator: 'included',
                type: 'match',
                value: '1234234659af249ddf3e40864e9fb241',
              },
              {
                field: 'process.executable.caseless',
                operator: 'included',
                type: 'match',
                value: '/bin/malware',
              },
            ],
            id: '123',
            name: 'linux trusted app 1',
            os: 'linux',
            version: 'abc123',
          },
        },
      });
    });

    it('should return 404 if trusted app does not exist', async () => {
      exceptionsListClient.getExceptionListItem.mockResolvedValue(null);

      await updateHandler(
        createHandlerContextMock(),
        httpServerMock.createKibanaRequest({ params: { id: '123' }, body: NEW_TRUSTED_APP }),
        mockResponse
      );

      expect(mockResponse.notFound).toHaveBeenCalledWith({
        body: expect.any(TrustedAppNotFoundError),
      });
    });

    it('should should return 409 if version conflict occurs', async () => {
      exceptionsListClient.getExceptionListItem.mockResolvedValue(EXCEPTION_LIST_ITEM);
      exceptionsListClient.updateExceptionListItem.mockRejectedValue(
        Object.assign(new Error(), { output: { statusCode: 409 } })
      );

      await updateHandler(
        createHandlerContextMock(),
        httpServerMock.createKibanaRequest({ params: { id: '123' }, body: NEW_TRUSTED_APP }),
        mockResponse
      );

      expect(mockResponse.conflict).toHaveBeenCalledWith({
        body: expect.any(TrustedAppVersionConflictError),
      });
    });

    it("should return error when policy doesn't exists", async () => {
      packagePolicyClient.getByIDs.mockReset();
      packagePolicyClient.getByIDs.mockResolvedValueOnce(getPackagePoliciesResponse());

      const exceptionByPolicy = getPutTrustedAppByPolicyMock();
      const customExceptionListClient = {
        ...exceptionsListClient,
        getExceptionListItem: () => exceptionByPolicy,
      };
      const handlerContextMock = {
        ...xpackMocks.createRequestHandlerContext(),
        lists: {
          getListClient: jest.fn(),
          getExceptionListClient: jest.fn().mockReturnValue(customExceptionListClient),
        },
      } as unknown as jest.Mocked<SecuritySolutionRequestHandlerContext>;
      await updateHandler(
        handlerContextMock,
        httpServerMock.createKibanaRequest({ body: getTrustedAppByPolicy() }),
        mockResponse
      );

      expect(appContextMock.logFactory.get('trusted_apps').error).toHaveBeenCalledWith(
        new TrustedAppPolicyNotExistsError(exceptionByPolicy.name, [
          '9da95be9-9bee-4761-a8c4-28d6d9bd8c71',
        ])
      );
    });

    it('should return error when license under platinum and by policy', async () => {
      licenseEmitter.next(Gold);
      packagePolicyClient.getByIDs.mockReset();
      packagePolicyClient.getByIDs.mockResolvedValueOnce(getPackagePoliciesResponse());

      const exceptionByPolicy = getPutTrustedAppByPolicyMock();
      const customExceptionListClient = {
        ...exceptionsListClient,
        getExceptionListItem: () => exceptionByPolicy,
      };
      const handlerContextMock = {
        ...xpackMocks.createRequestHandlerContext(),
        lists: {
          getListClient: jest.fn(),
          getExceptionListClient: jest.fn().mockReturnValue(customExceptionListClient),
        },
      } as unknown as jest.Mocked<SecuritySolutionRequestHandlerContext>;
      await updateHandler(
        handlerContextMock,
        httpServerMock.createKibanaRequest({ body: getTrustedAppByPolicy() }),
        mockResponse
      );

      expect(appContextMock.logFactory.get('trusted_apps').error).toHaveBeenCalledWith(
        new EndpointLicenseError()
      );
    });
  });
});
