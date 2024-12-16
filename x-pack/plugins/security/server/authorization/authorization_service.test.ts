/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Note: this import must be before other relative imports for the mocks to work as intended.
import {
  mockAuthorizationModeFactory,
  mockCheckPrivilegesDynamicallyWithRequestFactory,
  mockCheckPrivilegesFactory,
  mockCheckSavedObjectsPrivilegesWithRequestFactory,
  mockPrivilegesFactory,
  mockRegisterPrivilegesWithCluster,
} from './service.test.mocks';

import type { Client } from '@elastic/elasticsearch';
import { Subject } from 'rxjs';

import { coreMock, elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { privilegesFactory } from '@kbn/security-authorization-core';
import { nextTick } from '@kbn/test-jest-helpers';

import { AuthorizationService } from './authorization_service';
import { checkPrivilegesFactory } from './check_privileges';
import { checkPrivilegesDynamicallyWithRequestFactory } from './check_privileges_dynamically';
import { checkSavedObjectsPrivilegesWithRequestFactory } from './check_saved_objects_privileges';
import { authorizationModeFactory } from './mode';
import { licenseMock } from '../../common/licensing/index.mock';
import type { OnlineStatusRetryScheduler } from '../elasticsearch';

const kibanaIndexName = '.a-kibana-index';
const application = `kibana-${kibanaIndexName}`;
const mockCheckPrivilegesWithRequest = Symbol();
const mockCheckUserProfilesPrivileges = Symbol();
const mockCheckPrivilegesDynamicallyWithRequest = Symbol();
const mockCheckSavedObjectsPrivilegesWithRequest = Symbol();
const mockPrivilegesService = Symbol();
const mockAuthorizationMode = Symbol();
const mockEsSecurityResponse = {
  security: { operator_privileges: { enabled: false, available: false } },
};
beforeEach(() => {
  mockCheckPrivilegesFactory.mockReturnValue({
    checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
    checkUserProfilesPrivileges: mockCheckUserProfilesPrivileges,
  });
  mockCheckPrivilegesDynamicallyWithRequestFactory.mockReturnValue(
    mockCheckPrivilegesDynamicallyWithRequest
  );
  mockCheckSavedObjectsPrivilegesWithRequestFactory.mockReturnValue(
    mockCheckSavedObjectsPrivilegesWithRequest
  );
  mockPrivilegesFactory.mockReturnValue(mockPrivilegesService);
  mockAuthorizationModeFactory.mockReturnValue(mockAuthorizationMode);
});

afterEach(() => {
  mockRegisterPrivilegesWithCluster.mockClear();
});

it(`#setup returns exposed services`, () => {
  const mockClusterClient = elasticsearchServiceMock.createClusterClient();
  mockClusterClient.asInternalUser.xpack.usage.mockResolvedValue(
    mockEsSecurityResponse as Awaited<ReturnType<Client['xpack']['usage']>>
  );
  const mockGetSpacesService = jest
    .fn()
    .mockReturnValue({ getSpaceId: jest.fn(), namespaceToSpaceId: jest.fn() });
  const mockFeaturesSetup = featuresPluginMock.createSetup();
  const mockLicense = licenseMock.create();
  const mockCoreSetup = coreMock.createSetup();

  const authorizationService = new AuthorizationService();
  const getClusterClient = () => Promise.resolve(mockClusterClient);
  const authz = authorizationService.setup({
    http: mockCoreSetup.http,
    capabilities: mockCoreSetup.capabilities,
    getClusterClient,
    license: mockLicense,
    loggers: loggingSystemMock.create(),
    kibanaIndexName,
    packageVersion: 'some-version',
    features: mockFeaturesSetup,
    getSpacesService: mockGetSpacesService,
    getCurrentUser: jest.fn(),
    customBranding: mockCoreSetup.customBranding,
  });

  expect(authz.applicationName).toBe(application);

  expect(authz.checkPrivilegesWithRequest).toBe(mockCheckPrivilegesWithRequest);
  expect(checkPrivilegesFactory).toHaveBeenCalledWith(
    authz.actions,
    getClusterClient,
    authz.applicationName
  );

  expect(authz.checkPrivilegesDynamicallyWithRequest).toBe(
    mockCheckPrivilegesDynamicallyWithRequest
  );
  expect(authz.checkUserProfilesPrivileges).toBe(mockCheckUserProfilesPrivileges);
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
  expect(privilegesFactory).toHaveBeenCalledWith(authz.actions, mockFeaturesSetup, mockLicense);

  expect(authz.mode).toBe(mockAuthorizationMode);
  expect(authorizationModeFactory).toHaveBeenCalledWith(mockLicense);

  expect(mockCoreSetup.capabilities.registerSwitcher).toHaveBeenCalledTimes(1);
  expect(mockCoreSetup.capabilities.registerSwitcher).toHaveBeenCalledWith(expect.any(Function), {
    capabilityPath: '*',
  });
});

describe('#start', () => {
  let statusSubject: Subject<OnlineStatusRetryScheduler>;
  beforeEach(() => {
    statusSubject = new Subject<OnlineStatusRetryScheduler>();

    const mockClusterClient = elasticsearchServiceMock.createClusterClient();
    mockClusterClient.asInternalUser.xpack.usage.mockResolvedValue(
      mockEsSecurityResponse as Awaited<ReturnType<Client['xpack']['usage']>>
    );
    const mockCoreSetup = coreMock.createSetup();

    const authorizationService = new AuthorizationService();
    authorizationService.setup({
      http: mockCoreSetup.http,
      capabilities: mockCoreSetup.capabilities,
      getClusterClient: () => Promise.resolve(mockClusterClient),
      license: licenseMock.create(),
      loggers: loggingSystemMock.create(),
      kibanaIndexName,
      packageVersion: 'some-version',
      features: featuresPluginMock.createSetup(),
      getSpacesService: jest
        .fn()
        .mockReturnValue({ getSpaceId: jest.fn(), namespaceToSpaceId: jest.fn() }),
      getCurrentUser: jest.fn(),
      customBranding: mockCoreSetup.customBranding,
    });

    authorizationService.start({
      clusterClient: mockClusterClient,
      features: featuresPluginMock.createStart(),
      online$: statusSubject.asObservable(),
    });

    // ES and license aren't available yet.
    expect(mockRegisterPrivilegesWithCluster).not.toHaveBeenCalled();
  });

  it('registers cluster privileges', async () => {
    const retryScheduler = jest.fn();
    statusSubject.next({ scheduleRetry: retryScheduler });
    expect(mockRegisterPrivilegesWithCluster).toHaveBeenCalledTimes(1);

    // New changes still trigger privileges re-registration.
    statusSubject.next({ scheduleRetry: retryScheduler });
    expect(mockRegisterPrivilegesWithCluster).toHaveBeenCalledTimes(2);
    expect(retryScheduler).not.toHaveBeenCalled();
  });

  it('schedules retries if fails to register cluster privileges', async () => {
    mockRegisterPrivilegesWithCluster.mockRejectedValue(new Error('Some error'));

    const retryScheduler = jest.fn();
    statusSubject.next({ scheduleRetry: retryScheduler });
    await nextTick();

    expect(mockRegisterPrivilegesWithCluster).toHaveBeenCalledTimes(1);
    expect(retryScheduler).toHaveBeenCalledTimes(1);

    statusSubject.next({ scheduleRetry: retryScheduler });
    await nextTick();

    expect(mockRegisterPrivilegesWithCluster).toHaveBeenCalledTimes(2);
    expect(retryScheduler).toHaveBeenCalledTimes(2);

    // When call finally succeeds retries aren't scheduled anymore.
    mockRegisterPrivilegesWithCluster.mockResolvedValue(undefined);
    statusSubject.next({ scheduleRetry: retryScheduler });
    await nextTick();

    expect(mockRegisterPrivilegesWithCluster).toHaveBeenCalledTimes(3);
    expect(retryScheduler).toHaveBeenCalledTimes(2);
  });
});

it('#stop unsubscribes from license and ES updates.', async () => {
  const mockClusterClient = elasticsearchServiceMock.createClusterClient();
  mockClusterClient.asInternalUser.xpack.usage.mockResolvedValue(
    mockEsSecurityResponse as Awaited<ReturnType<Client['xpack']['usage']>>
  );
  const statusSubject = new Subject<OnlineStatusRetryScheduler>();
  const mockCoreSetup = coreMock.createSetup();

  const authorizationService = new AuthorizationService();
  authorizationService.setup({
    http: mockCoreSetup.http,
    capabilities: mockCoreSetup.capabilities,
    getClusterClient: () => Promise.resolve(mockClusterClient),
    license: licenseMock.create(),
    loggers: loggingSystemMock.create(),
    kibanaIndexName,
    packageVersion: 'some-version',
    features: featuresPluginMock.createSetup(),
    getSpacesService: jest
      .fn()
      .mockReturnValue({ getSpaceId: jest.fn(), namespaceToSpaceId: jest.fn() }),
    getCurrentUser: jest.fn(),
    customBranding: mockCoreSetup.customBranding,
  });

  authorizationService.start({
    clusterClient: mockClusterClient,
    features: featuresPluginMock.createStart(),
    online$: statusSubject.asObservable(),
  });

  authorizationService.stop();

  // After stop we don't register privileges even if status changes.
  const retryScheduler = jest.fn();
  statusSubject.next({ scheduleRetry: retryScheduler });
  await nextTick();

  expect(mockRegisterPrivilegesWithCluster).not.toHaveBeenCalled();
  expect(retryScheduler).not.toHaveBeenCalled();
});
