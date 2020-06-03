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
  mockRegisterPrivilegesWithCluster,
} from './service.test.mocks';

import { Subject } from 'rxjs';
import { OnlineStatusRetryScheduler } from '../elasticsearch';
import { checkPrivilegesWithRequestFactory } from './check_privileges';
import { checkPrivilegesDynamicallyWithRequestFactory } from './check_privileges_dynamically';
import { checkSavedObjectsPrivilegesWithRequestFactory } from './check_saved_objects_privileges';
import { authorizationModeFactory } from './mode';
import { privilegesFactory } from './privileges';
import { AuthorizationService } from '.';

import { nextTick } from 'test_utils/enzyme_helpers';
import {
  coreMock,
  elasticsearchServiceMock,
  loggingSystemMock,
} from '../../../../../src/core/server/mocks';
import { featuresPluginMock } from '../../../features/server/mocks';
import { licenseMock } from '../../common/licensing/index.mock';

const kibanaIndexName = '.a-kibana-index';
const application = `kibana-${kibanaIndexName}`;
const mockCheckPrivilegesWithRequest = Symbol();
const mockCheckPrivilegesDynamicallyWithRequest = Symbol();
const mockCheckSavedObjectsPrivilegesWithRequest = Symbol();
const mockPrivilegesService = Symbol();
const mockAuthorizationMode = Symbol();
beforeEach(() => {
  mockCheckPrivilegesWithRequestFactory.mockReturnValue(mockCheckPrivilegesWithRequest);
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
  const mockClusterClient = elasticsearchServiceMock.createLegacyClusterClient();
  const mockGetSpacesService = jest
    .fn()
    .mockReturnValue({ getSpaceId: jest.fn(), namespaceToSpaceId: jest.fn() });
  const mockFeaturesSetup = featuresPluginMock.createSetup();
  const mockLicense = licenseMock.create();
  const mockCoreSetup = coreMock.createSetup();

  const authorizationService = new AuthorizationService();
  const authz = authorizationService.setup({
    http: mockCoreSetup.http,
    capabilities: mockCoreSetup.capabilities,
    clusterClient: mockClusterClient,
    license: mockLicense,
    loggers: loggingSystemMock.create(),
    kibanaIndexName,
    packageVersion: 'some-version',
    features: mockFeaturesSetup,
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
  expect(privilegesFactory).toHaveBeenCalledWith(authz.actions, mockFeaturesSetup, mockLicense);

  expect(authz.mode).toBe(mockAuthorizationMode);
  expect(authorizationModeFactory).toHaveBeenCalledWith(mockLicense);

  expect(mockCoreSetup.capabilities.registerSwitcher).toHaveBeenCalledTimes(1);
  expect(mockCoreSetup.capabilities.registerSwitcher).toHaveBeenCalledWith(expect.any(Function));
});

describe('#start', () => {
  let statusSubject: Subject<OnlineStatusRetryScheduler>;
  beforeEach(() => {
    statusSubject = new Subject<OnlineStatusRetryScheduler>();

    const mockClusterClient = elasticsearchServiceMock.createLegacyClusterClient();
    const mockCoreSetup = coreMock.createSetup();

    const authorizationService = new AuthorizationService();
    authorizationService.setup({
      http: mockCoreSetup.http,
      capabilities: mockCoreSetup.capabilities,
      clusterClient: mockClusterClient,
      license: licenseMock.create(),
      loggers: loggingSystemMock.create(),
      kibanaIndexName,
      packageVersion: 'some-version',
      features: featuresPluginMock.createSetup(),
      getSpacesService: jest
        .fn()
        .mockReturnValue({ getSpaceId: jest.fn(), namespaceToSpaceId: jest.fn() }),
    });

    const featuresStart = featuresPluginMock.createStart();
    featuresStart.getFeatures.mockReturnValue([]);

    authorizationService.start({
      clusterClient: mockClusterClient,
      features: featuresStart,
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
  const mockClusterClient = elasticsearchServiceMock.createLegacyClusterClient();
  const statusSubject = new Subject<OnlineStatusRetryScheduler>();
  const mockCoreSetup = coreMock.createSetup();

  const authorizationService = new AuthorizationService();
  authorizationService.setup({
    http: mockCoreSetup.http,
    capabilities: mockCoreSetup.capabilities,
    clusterClient: mockClusterClient,
    license: licenseMock.create(),
    loggers: loggingSystemMock.create(),
    kibanaIndexName,
    packageVersion: 'some-version',
    features: featuresPluginMock.createSetup(),
    getSpacesService: jest
      .fn()
      .mockReturnValue({ getSpaceId: jest.fn(), namespaceToSpaceId: jest.fn() }),
  });

  const featuresStart = featuresPluginMock.createStart();
  featuresStart.getFeatures.mockReturnValue([]);
  authorizationService.start({
    clusterClient: mockClusterClient,
    features: featuresStart,
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
