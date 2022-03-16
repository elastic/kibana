/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, KibanaResponseFactory } from 'src/core/server';
import { coreMock, httpServerMock } from 'src/core/server/mocks';
import { ReportingCore } from '../../';
import { ReportingInternalSetup, ReportingInternalStart } from '../../core';
import {
  createMockConfigSchema,
  createMockPluginSetup,
  createMockPluginStart,
  createMockReportingCore,
} from '../../test_helpers';
import type { ReportingRequestHandlerContext } from '../../types';
import { authorizedUserPreRouting } from './authorized_user_pre_routing';

let mockCore: ReportingCore;
let mockSetupDeps: ReportingInternalSetup;
let mockStartDeps: ReportingInternalStart;
let mockReportingConfig = createMockConfigSchema({ roles: { enabled: false } });

const getMockContext = () =>
  ({
    core: coreMock.createRequestHandlerContext(),
  } as unknown as ReportingRequestHandlerContext);

const getMockRequest = () =>
  ({
    url: { port: '5601', search: '', pathname: '/foo' },
    route: { path: '/foo', options: {} },
  } as KibanaRequest);

const getMockResponseFactory = () =>
  ({
    ...httpServerMock.createResponseFactory(),
    forbidden: (obj: unknown) => obj,
    unauthorized: (obj: unknown) => obj,
  } as unknown as KibanaResponseFactory);

describe('authorized_user_pre_routing', function () {
  beforeEach(async () => {
    mockSetupDeps = createMockPluginSetup({
      security: { license: { isEnabled: () => true } },
    });

    mockStartDeps = await createMockPluginStart(
      {
        security: {
          authc: {
            getCurrentUser: () => ({ id: '123', roles: ['superuser'], username: 'Tom Riddle' }),
          },
        },
      },
      mockReportingConfig
    );
    mockCore = await createMockReportingCore(mockReportingConfig, mockSetupDeps, mockStartDeps);
  });

  it('should return from handler with a "false" user when security plugin is not found', async function () {
    mockSetupDeps = createMockPluginSetup({ security: undefined });
    mockCore = await createMockReportingCore(mockReportingConfig, mockSetupDeps, mockStartDeps);
    const mockResponseFactory = httpServerMock.createResponseFactory() as KibanaResponseFactory;

    let handlerCalled = false;
    await authorizedUserPreRouting(mockCore, (user: unknown) => {
      expect(user).toBe(false); // verify the user is a false value
      handlerCalled = true;
      return Promise.resolve({ status: 200, options: {} });
    })(getMockContext(), getMockRequest(), mockResponseFactory);

    expect(handlerCalled).toBe(true);
  });

  it('should return from handler with a "false" user when security is disabled', async function () {
    mockSetupDeps = createMockPluginSetup({
      security: { license: { isEnabled: () => false } }, // disable security
    });
    mockCore = await createMockReportingCore(mockReportingConfig, mockSetupDeps, mockStartDeps);
    const mockResponseFactory = httpServerMock.createResponseFactory() as KibanaResponseFactory;

    let handlerCalled = false;
    await authorizedUserPreRouting(mockCore, (user: unknown) => {
      expect(user).toBe(false); // verify the user is a false value
      handlerCalled = true;
      return Promise.resolve({ status: 200, options: {} });
    })(getMockContext(), getMockRequest(), mockResponseFactory);

    expect(handlerCalled).toBe(true);
  });

  it('should return with 401 when security is enabled and the request is unauthenticated', async function () {
    mockSetupDeps = createMockPluginSetup({
      security: { license: { isEnabled: () => true } },
    });
    mockStartDeps = await createMockPluginStart(
      { security: { authc: { getCurrentUser: () => null } } },
      mockReportingConfig
    );
    mockCore = await createMockReportingCore(mockReportingConfig, mockSetupDeps, mockStartDeps);
    const mockHandler = () => {
      throw new Error('Handler callback should not be called');
    };
    const requestHandler = authorizedUserPreRouting(mockCore, mockHandler);

    await expect(
      requestHandler(getMockContext(), getMockRequest(), getMockResponseFactory())
    ).resolves.toMatchObject({
      body: `Sorry, you aren't authenticated`,
    });
  });

  describe('Deprecated: security roles for access control', () => {
    beforeEach(async () => {
      mockReportingConfig = createMockConfigSchema({
        roles: {
          allow: ['reporting_user'],
          enabled: true,
        },
      });
    });

    it(`should return with 403 when security is enabled but user doesn't have the allowed role`, async function () {
      mockStartDeps = await createMockPluginStart(
        {
          security: {
            authc: {
              getCurrentUser: () => ({ id: '123', roles: ['peasant'], username: 'Tom Riddle' }),
            },
          },
        },
        mockReportingConfig
      );
      mockCore = await createMockReportingCore(mockReportingConfig, mockSetupDeps, mockStartDeps);
      const mockHandler = () => {
        throw new Error('Handler callback should not be called');
      };

      expect(
        await authorizedUserPreRouting(mockCore, mockHandler)(
          getMockContext(),
          getMockRequest(),
          getMockResponseFactory()
        )
      ).toMatchObject({ body: `Sorry, you don't have access to Reporting` });
    });

    it('should return from handler when security is enabled and user has explicitly allowed role', async function () {
      mockStartDeps = await createMockPluginStart(
        {
          security: {
            authc: {
              getCurrentUser: () => ({ username: 'friendlyuser', roles: ['reporting_user'] }),
            },
          },
        },
        mockReportingConfig
      );
      mockCore = await createMockReportingCore(mockReportingConfig, mockSetupDeps, mockStartDeps);

      let handlerCalled = false;
      await authorizedUserPreRouting(mockCore, (user: unknown) => {
        expect(user).toMatchObject({ roles: ['reporting_user'], username: 'friendlyuser' });
        handlerCalled = true;
        return Promise.resolve({ status: 200, options: {} });
      })(getMockContext(), getMockRequest(), getMockResponseFactory());
      expect(handlerCalled).toBe(true);
    });

    it('should return from handler when security is enabled and user has superuser role', async function () {
      mockStartDeps = await createMockPluginStart(
        {
          security: {
            authc: { getCurrentUser: () => ({ username: 'friendlyuser', roles: ['superuser'] }) },
          },
        },
        mockReportingConfig
      );
      mockCore = await createMockReportingCore(mockReportingConfig, mockSetupDeps, mockStartDeps);

      const handler = jest.fn().mockResolvedValue({ status: 200, options: {} });
      await authorizedUserPreRouting(mockCore, handler)(
        getMockContext(),
        getMockRequest(),
        getMockResponseFactory()
      );

      expect(handler).toHaveBeenCalled();
      const [[user]] = handler.mock.calls;
      expect(user).toMatchObject({ roles: ['superuser'], username: 'friendlyuser' });
    });
  });
});
