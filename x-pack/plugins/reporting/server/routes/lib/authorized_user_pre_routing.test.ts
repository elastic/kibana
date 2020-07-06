/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, RequestHandlerContext, KibanaResponseFactory } from 'kibana/server';
import { coreMock, httpServerMock } from 'src/core/server/mocks';
import { ReportingCore } from '../../';
import { createMockReportingCore } from '../../test_helpers';
import { authorizedUserPreRoutingFactory } from './authorized_user_pre_routing';
import { ReportingInternalSetup } from '../../core';

let mockCore: ReportingCore;
const kbnConfig = {
  'server.basePath': '/sbp',
};
const reportingConfig = {
  'roles.allow': ['reporting_user'],
};
const mockReportingConfig = {
  get: (...keys: string[]) => (reportingConfig as any)[keys.join('.')] || 'whoah!',
  kbnConfig: { get: (...keys: string[]) => (kbnConfig as any)[keys.join('.')] },
};

const getMockContext = () =>
  (({
    core: coreMock.createRequestHandlerContext(),
  } as unknown) as RequestHandlerContext);

const getMockRequest = () =>
  ({
    url: { port: '5601', query: '', path: '/foo' },
    route: { path: '/foo', options: {} },
  } as KibanaRequest);

const getMockResponseFactory = () =>
  (({
    ...httpServerMock.createResponseFactory(),
    forbidden: (obj: unknown) => obj,
    unauthorized: (obj: unknown) => obj,
  } as unknown) as KibanaResponseFactory);

describe('authorized_user_pre_routing', function () {
  beforeEach(async () => {
    mockCore = await createMockReportingCore(mockReportingConfig);
  });

  it('should return from handler with a "null" user when security plugin is not found', async function () {
    mockCore.getPluginSetupDeps = () =>
      (({
        // @ts-ignore
        ...mockCore.pluginSetupDeps,
        security: undefined, // disable security
      } as unknown) as ReportingInternalSetup);
    const authorizedUserPreRouting = authorizedUserPreRoutingFactory(mockCore);
    const mockResponseFactory = httpServerMock.createResponseFactory() as KibanaResponseFactory;

    let handlerCalled = false;
    authorizedUserPreRouting((user: unknown) => {
      expect(user).toBe(null); // verify the user is a null value
      handlerCalled = true;
      return Promise.resolve({ status: 200, options: {} });
    })(getMockContext(), getMockRequest(), mockResponseFactory);

    expect(handlerCalled).toBe(true);
  });

  it('should return from handler with a "null" user when security is disabled', async function () {
    mockCore.getPluginSetupDeps = () =>
      (({
        // @ts-ignore
        ...mockCore.pluginSetupDeps,
        security: {
          license: {
            isEnabled: () => false,
          },
        }, // disable security
      } as unknown) as ReportingInternalSetup);
    const authorizedUserPreRouting = authorizedUserPreRoutingFactory(mockCore);
    const mockResponseFactory = httpServerMock.createResponseFactory() as KibanaResponseFactory;

    let handlerCalled = false;
    authorizedUserPreRouting((user: unknown) => {
      expect(user).toBe(null); // verify the user is a null value
      handlerCalled = true;
      return Promise.resolve({ status: 200, options: {} });
    })(getMockContext(), getMockRequest(), mockResponseFactory);

    expect(handlerCalled).toBe(true);
  });

  it('should return with 401 when security is enabled and the request is unauthenticated', async function () {
    mockCore.getPluginSetupDeps = () =>
      (({
        // @ts-ignore
        ...mockCore.pluginSetupDeps,
        security: {
          license: { isEnabled: () => true },
          authc: { getCurrentUser: () => null },
        },
      } as unknown) as ReportingInternalSetup);
    const authorizedUserPreRouting = authorizedUserPreRoutingFactory(mockCore);
    const mockHandler = () => {
      throw new Error('Handler callback should not be called');
    };
    const requestHandler = authorizedUserPreRouting(mockHandler);
    const mockResponseFactory = getMockResponseFactory();

    expect(requestHandler(getMockContext(), getMockRequest(), mockResponseFactory)).toMatchObject({
      body: `Sorry, you aren't authenticated`,
    });
  });

  it(`should return with 403 when security is enabled but user doesn't have the allowed role`, async function () {
    mockCore.getPluginSetupDeps = () =>
      (({
        // @ts-ignore
        ...mockCore.pluginSetupDeps,
        security: {
          license: { isEnabled: () => true },
          authc: { getCurrentUser: () => ({ username: 'friendlyuser', roles: ['cowboy'] }) },
        },
      } as unknown) as ReportingInternalSetup);
    const authorizedUserPreRouting = authorizedUserPreRoutingFactory(mockCore);
    const mockResponseFactory = getMockResponseFactory();

    const mockHandler = () => {
      throw new Error('Handler callback should not be called');
    };
    expect(
      authorizedUserPreRouting(mockHandler)(getMockContext(), getMockRequest(), mockResponseFactory)
    ).toMatchObject({ body: `Sorry, you don't have access to Reporting` });
  });

  it('should return from handler when security is enabled and user has explicitly allowed role', async function (done) {
    mockCore.getPluginSetupDeps = () =>
      (({
        // @ts-ignore
        ...mockCore.pluginSetupDeps,
        security: {
          license: { isEnabled: () => true },
          authc: {
            getCurrentUser: () => ({ username: 'friendlyuser', roles: ['reporting_user'] }),
          },
        },
      } as unknown) as ReportingInternalSetup);
    // @ts-ignore overloading config getter
    mockCore.config = mockReportingConfig;
    const authorizedUserPreRouting = authorizedUserPreRoutingFactory(mockCore);
    const mockResponseFactory = getMockResponseFactory();

    authorizedUserPreRouting((user) => {
      expect(user).toMatchObject({ roles: ['reporting_user'], username: 'friendlyuser' });
      done();
      return Promise.resolve({ status: 200, options: {} });
    })(getMockContext(), getMockRequest(), mockResponseFactory);
  });

  it('should return from handler when security is enabled and user has superuser role', async function () {});
});
