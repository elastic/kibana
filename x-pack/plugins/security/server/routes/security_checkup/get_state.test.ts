/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/order
import { mockCreateClusterDataCheck } from './get_state.test.mock';

import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';

import { kibanaResponseFactory } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';

import type { SecurityLicenseFeatures } from '../../../common/licensing';
import { licenseMock } from '../../../common/licensing/index.mock';
import { routeDefinitionParamsMock, securityRequestHandlerContextMock } from '../index.mock';
import { defineSecurityCheckupGetStateRoutes } from './get_state';

interface SetupParams {
  showInsecureClusterWarning: boolean;
  allowRbac: boolean;
  doesClusterHaveUserData: boolean;
}

function setup({ showInsecureClusterWarning, allowRbac, doesClusterHaveUserData }: SetupParams) {
  const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
  const configSubject = new BehaviorSubject({ showInsecureClusterWarning });
  (mockRouteDefinitionParams.config$ as Observable<{ showInsecureClusterWarning: boolean }>) =
    configSubject.asObservable();

  const licenseWithFeatures = licenseMock.create();
  const featuresSubject = new BehaviorSubject({ allowRbac } as SecurityLicenseFeatures);
  licenseWithFeatures.features$ = featuresSubject.asObservable();

  const mockClusterDataCheck = jest.fn().mockResolvedValue(doesClusterHaveUserData);
  mockCreateClusterDataCheck.mockReturnValue(mockClusterDataCheck);

  const mockContext = securityRequestHandlerContextMock.create();
  defineSecurityCheckupGetStateRoutes({
    ...mockRouteDefinitionParams,
    license: licenseWithFeatures,
  });
  const [[, handler]] = mockRouteDefinitionParams.router.get.mock.calls;
  const headers = { authorization: 'foo' };
  const mockRequest = httpServerMock.createKibanaRequest({
    method: 'get',
    path: `/internal/security/anonymous_access/state`,
    headers,
  });

  return {
    configSubject,
    featuresSubject,
    mockClusterDataCheck,
    simulateRequest: () => handler(mockContext, mockRequest, kibanaResponseFactory),
  };
}

describe('GET /internal/security/security_checkup/state', () => {
  it('responds `displayAlert == false` if plugin is not configured to display alerts', async () => {
    const { simulateRequest, mockClusterDataCheck } = setup({
      showInsecureClusterWarning: false,
      allowRbac: false,
      doesClusterHaveUserData: true,
    });

    const response = await simulateRequest();
    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ displayAlert: false });
    expect(mockClusterDataCheck).not.toHaveBeenCalled();
  });

  it('responds `displayAlert == false` if Elasticsearch security is already enabled', async () => {
    const { simulateRequest, mockClusterDataCheck } = setup({
      showInsecureClusterWarning: true,
      allowRbac: true,
      doesClusterHaveUserData: true,
    });

    const response = await simulateRequest();
    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ displayAlert: false });
    expect(mockClusterDataCheck).not.toHaveBeenCalled();
  });

  it('responds `displayAlert == false` if the cluster does not contain user data', async () => {
    const { simulateRequest, mockClusterDataCheck } = setup({
      showInsecureClusterWarning: true,
      allowRbac: false,
      doesClusterHaveUserData: false,
    });

    const response = await simulateRequest();
    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ displayAlert: false });
    // since the plugin is configured to display alerts AND Elasticsearch security is disabled, we checked the cluster to see if it contained user data
    expect(mockClusterDataCheck).toHaveBeenCalledTimes(1);
  });

  it('responds `displayAlert == true` if all conditions are met', async () => {
    const { simulateRequest, mockClusterDataCheck } = setup({
      showInsecureClusterWarning: true,
      allowRbac: false,
      doesClusterHaveUserData: true,
    });

    const response = await simulateRequest();
    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ displayAlert: true });
    expect(mockClusterDataCheck).toHaveBeenCalledTimes(1);
  });

  it('handles state changes', async () => {
    const { configSubject, featuresSubject, simulateRequest, mockClusterDataCheck } = setup({
      showInsecureClusterWarning: false,
      allowRbac: false,
      doesClusterHaveUserData: true,
    });

    const response1 = await simulateRequest();
    expect(response1.status).toBe(200);
    expect(response1.payload).toEqual({ displayAlert: false });
    expect(mockClusterDataCheck).not.toHaveBeenCalled();

    configSubject.next({ showInsecureClusterWarning: true }); // enable insecure cluster warning
    const response2 = await simulateRequest();
    expect(response2.status).toBe(200);
    expect(response2.payload).toEqual({ displayAlert: true }); // now that the warning is enabled, all conditions are met and it should be displayed
    expect(mockClusterDataCheck).toHaveBeenCalledTimes(1);

    featuresSubject.next({ allowRbac: true } as SecurityLicenseFeatures); // enable Elasticsearch security
    const response3 = await simulateRequest();
    expect(response3.status).toBe(200);
    expect(response3.payload).toEqual({ displayAlert: false }); // now that Elasticsearch security is enabled, we don't need to display the alert anymore
    expect(mockClusterDataCheck).toHaveBeenCalledTimes(1); // we did not check the cluster for data again because Elasticsearch security is enabled
  });
});
