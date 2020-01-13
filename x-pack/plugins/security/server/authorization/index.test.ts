/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  mockAuthorizationModeFactory,
  mockCheckPrivilegesDynamicallyWithRequestFactory,
  mockCheckPrivilegesWithRequestFactory,
  mockCheckSavedObjectsPrivilegesWithRequestFactory,
  mockPrivilegesFactory,
} from './service.test.mocks';

import { checkPrivilegesWithRequestFactory } from './check_privileges';
import { checkPrivilegesDynamicallyWithRequestFactory } from './check_privileges_dynamically';
import { checkSavedObjectsPrivilegesWithRequestFactory } from './check_saved_objects_privileges';
import { authorizationModeFactory } from './mode';
import { privilegesFactory } from './privileges';
import { setupAuthorization } from '.';

import {
  coreMock,
  elasticsearchServiceMock,
  loggingServiceMock,
} from '../../../../../src/core/server/mocks';
import { licenseMock } from '../../common/licensing/index.mock';

test(`returns exposed services`, () => {
  const kibanaIndexName = '.a-kibana-index';
  const application = `kibana-${kibanaIndexName}`;

  const mockCheckPrivilegesWithRequest = Symbol();
  mockCheckPrivilegesWithRequestFactory.mockReturnValue(mockCheckPrivilegesWithRequest);

  const mockCheckPrivilegesDynamicallyWithRequest = Symbol();
  mockCheckPrivilegesDynamicallyWithRequestFactory.mockReturnValue(
    mockCheckPrivilegesDynamicallyWithRequest
  );

  const mockCheckSavedObjectsPrivilegesWithRequest = Symbol();
  mockCheckSavedObjectsPrivilegesWithRequestFactory.mockReturnValue(
    mockCheckSavedObjectsPrivilegesWithRequest
  );

  const mockPrivilegesService = Symbol();
  mockPrivilegesFactory.mockReturnValue(mockPrivilegesService);
  const mockAuthorizationMode = Symbol();
  mockAuthorizationModeFactory.mockReturnValue(mockAuthorizationMode);

  const mockClusterClient = elasticsearchServiceMock.createClusterClient();
  const mockGetSpacesService = jest
    .fn()
    .mockReturnValue({ getSpaceId: jest.fn(), namespaceToSpaceId: jest.fn() });
  const mockFeaturesService = { getFeatures: () => [] };
  const mockLicense = licenseMock.create();

  const authz = setupAuthorization({
    http: coreMock.createSetup().http,
    clusterClient: mockClusterClient,
    license: mockLicense,
    loggers: loggingServiceMock.create(),
    kibanaIndexName,
    packageVersion: 'some-version',
    featuresService: mockFeaturesService,
    getSpacesService: mockGetSpacesService,
  });

  expect(authz.actions.version).toBe('version:some-version');
  expect(authz.applicationName).toBe(application);

  expect(authz.checkPrivilegesWithRequest).toBe(mockCheckPrivilegesWithRequest);
  expect(checkPrivilegesWithRequestFactory).toHaveBeenCalledWith(
    authz.actions,
    mockClusterClient,
    authz.applicationName
  );

  expect(authz.checkPrivilegesDynamicallyWithRequest).toBe(
    mockCheckPrivilegesDynamicallyWithRequest
  );
  expect(checkPrivilegesDynamicallyWithRequestFactory).toHaveBeenCalledWith(
    mockCheckPrivilegesWithRequest,
    mockGetSpacesService
  );

  expect(authz.checkSavedObjectsPrivilegesWithRequest).toBe(
    mockCheckSavedObjectsPrivilegesWithRequest
  );
  expect(checkSavedObjectsPrivilegesWithRequestFactory).toHaveBeenCalledWith(
    mockCheckPrivilegesWithRequest,
    mockGetSpacesService
  );

  expect(authz.privileges).toBe(mockPrivilegesService);
  expect(privilegesFactory).toHaveBeenCalledWith(authz.actions, mockFeaturesService);

  expect(authz.mode).toBe(mockAuthorizationMode);
  expect(authorizationModeFactory).toHaveBeenCalledWith(mockLicense);
});
