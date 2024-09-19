/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, KibanaResponseFactory } from 'src/core/server';
import { coreMock, httpServerMock } from 'src/core/server/mocks';
import { ReportingCore } from '../../';
import { ReportingInternalSetup } from '../../core';
import { createMockConfigSchema, createMockReportingCore } from '../../test_helpers';
import type { ReportingRequestHandlerContext } from '../../types';
import { authorizedUserPreRouting } from './authorized_user_pre_routing';

let mockCore: ReportingCore;
const mockReportingConfig = createMockConfigSchema({ roles: { enabled: false } });

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
    mockCore = await createMockReportingCore(mockReportingConfig);
  });

  it('should return from handler with a "false" user when security plugin is not found', async function () {
    mockCore.getPluginSetupDeps = () =>
      ({
        // @ts-ignore
        ...mockCore.pluginSetupDeps,
        security: undefined, // disable security
      } as unknown as ReportingInternalSetup);
    const mockResponseFactory = httpServerMock.createResponseFactory() as KibanaResponseFactory;

    let handlerCalled = false;
    authorizedUserPreRouting(mockCore, (user: unknown) => {
      expect(user).toBe(false); // verify the user is a false value
      handlerCalled = true;
      return Promise.resolve({ status: 200, options: {} });
    })(getMockContext(), getMockRequest(), mockResponseFactory);

    expect(handlerCalled).toBe(true);
  });

  it('should return from handler with a "false" user when security is disabled', async function () {
    mockCore.getPluginSetupDeps = () =>
      ({
        // @ts-ignore
        ...mockCore.pluginSetupDeps,
        security: {
          license: {
            isEnabled: () => false,
          },
        }, // disable security
      } as unknown as ReportingInternalSetup);
    const mockResponseFactory = httpServerMock.createResponseFactory() as KibanaResponseFactory;

    let handlerCalled = false;
    authorizedUserPreRouting(mockCore, (user: unknown) => {
      expect(user).toBe(false); // verify the user is a false value
      handlerCalled = true;
      return Promise.resolve({ status: 200, options: {} });
    })(getMockContext(), getMockRequest(), mockResponseFactory);

    expect(handlerCalled).toBe(true);
  });

  it('should return with 401 when security is enabled and the request is unauthenticated', async function () {
    mockCore.getPluginSetupDeps = () =>
      ({
        // @ts-ignore
        ...mockCore.pluginSetupDeps,
        security: {
          license: { isEnabled: () => true },
          authc: { getCurrentUser: () => null },
        },
      } as unknown as ReportingInternalSetup);
    const mockHandler = () => {
      throw new Error('Handler callback should not be called');
    };
    const requestHandler = authorizedUserPreRouting(mockCore, mockHandler);
    const mockResponseFactory = getMockResponseFactory();

    expect(requestHandler(getMockContext(), getMockRequest(), mockResponseFactory)).toMatchObject({
      body: `Sorry, you aren't authenticated`,
    });
  });

  describe('Deprecated: security roles for access control', () => {
    beforeEach(async () => {
      const mockReportingConfigDeprecated = createMockConfigSchema({
        roles: {
          allow: ['reporting_user'],
          enabled: true,
        },
      });
      mockCore = await createMockReportingCore(mockReportingConfigDeprecated);
    });

    it(`should return with 403 when security is enabled but user doesn't have the allowed role`, async function () {
      mockCore.getPluginSetupDeps = () =>
        ({
          // @ts-ignore
          ...mockCore.pluginSetupDeps,
          security: {
            license: { isEnabled: () => true },
            authc: { getCurrentUser: () => ({ username: 'friendlyuser', roles: ['cowboy'] }) },
          },
        } as unknown as ReportingInternalSetup);
      const mockResponseFactory = getMockResponseFactory();

      const mockHandler = () => {
        throw new Error('Handler callback should not be called');
      };
      expect(
        authorizedUserPreRouting(mockCore, mockHandler)(
          getMockContext(),
          getMockRequest(),
          mockResponseFactory
        )
      ).toMatchObject({ body: `Sorry, you don't have access to Reporting` });
    });

    it('should return from handler when security is enabled and user has explicitly allowed role', function (done) {
      mockCore.getPluginSetupDeps = () =>
        ({
          // @ts-ignore
          ...mockCore.pluginSetupDeps,
          security: {
            license: { isEnabled: () => true },
            authc: {
              getCurrentUser: () => ({ username: 'friendlyuser', roles: ['reporting_user'] }),
            },
          },
        } as unknown as ReportingInternalSetup);
      const mockResponseFactory = getMockResponseFactory();

      authorizedUserPreRouting(mockCore, (user) => {
        expect(user).toMatchObject({ roles: ['reporting_user'], username: 'friendlyuser' });
        done();
        return Promise.resolve({ status: 200, options: {} });
      })(getMockContext(), getMockRequest(), mockResponseFactory);
    });

    it('should return from handler when security is enabled and user has superuser role', async function () {});
  });
});
