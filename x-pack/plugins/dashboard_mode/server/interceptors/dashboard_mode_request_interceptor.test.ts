/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  OnPostAuthHandler,
  OnPostAuthToolkit,
  KibanaRequest,
  LifecycleResponseFactory,
  IUiSettingsClient,
} from 'kibana/server';
import { coreMock } from '../../../../../src/core/server/mocks';

import { AuthenticatedUser } from '../../../security/server';
import { securityMock } from '../../../security/server/mocks';

import { setupDashboardModeRequestInterceptor } from './dashboard_mode_request_interceptor';

const DASHBOARD_ONLY_MODE_ROLE = 'test_dashboard_only_mode_role';

describe('DashboardOnlyModeRequestInterceptor', () => {
  const core = coreMock.createSetup();
  const security = securityMock.createSetup();

  let interceptor: OnPostAuthHandler;
  let toolkit: OnPostAuthToolkit;
  let uiSettingsMock: any;

  beforeEach(() => {
    toolkit = {
      next: jest.fn(),
    };
    interceptor = setupDashboardModeRequestInterceptor({
      http: core.http,
      security,
      getUiSettingsClient: () =>
        (Promise.resolve({
          get: () => Promise.resolve(uiSettingsMock),
        }) as unknown) as Promise<IUiSettingsClient>,
    });
  });

  test('should not redirects for not app/* requests', async () => {
    const request = ({
      url: {
        path: 'api/test',
      },
    } as unknown) as KibanaRequest;

    interceptor(request, {} as LifecycleResponseFactory, toolkit);

    expect(toolkit.next).toHaveBeenCalled();
  });

  test('should not redirects not authenticated users', async () => {
    const request = ({
      url: {
        path: '/app/home',
      },
    } as unknown) as KibanaRequest;

    interceptor(request, {} as LifecycleResponseFactory, toolkit);

    expect(toolkit.next).toHaveBeenCalled();
  });

  describe('request for dashboard-only user', () => {
    function testRedirectToDashboardModeApp(url: string) {
      describe(`requests to url:"${url}"`, () => {
        test('redirects to the dashboard_mode app instead', async () => {
          const request = ({
            url: {
              path: url,
            },
            credentials: {
              roles: [DASHBOARD_ONLY_MODE_ROLE],
            },
          } as unknown) as KibanaRequest;

          const response = ({
            redirected: jest.fn(),
          } as unknown) as LifecycleResponseFactory;

          security.authc.getCurrentUser = jest.fn(
            (r: KibanaRequest) =>
              (({
                roles: [DASHBOARD_ONLY_MODE_ROLE],
              } as unknown) as AuthenticatedUser)
          );

          uiSettingsMock = [DASHBOARD_ONLY_MODE_ROLE];

          await interceptor(request, response, toolkit);

          expect(response.redirected).toHaveBeenCalledWith({
            headers: { location: `/mock-server-basepath/app/dashboard_mode` },
          });
        });
      });
    }

    testRedirectToDashboardModeApp('/app/kibana');
    testRedirectToDashboardModeApp('/app/kibana#/foo/bar');
    testRedirectToDashboardModeApp('/app/kibana/foo/bar');
    testRedirectToDashboardModeApp('/app/kibana?foo=bar');
    testRedirectToDashboardModeApp('/app/dashboards?foo=bar');
    testRedirectToDashboardModeApp('/app/home?foo=bar');
  });
});
