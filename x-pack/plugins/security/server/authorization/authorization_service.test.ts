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

import { BehaviorSubject } from 'rxjs';
import { CoreStatus, ServiceStatusLevels } from '../../../../../src/core/server';
import { checkPrivilegesWithRequestFactory } from './check_privileges';
import { checkPrivilegesDynamicallyWithRequestFactory } from './check_privileges_dynamically';
import { checkSavedObjectsPrivilegesWithRequestFactory } from './check_saved_objects_privileges';
import { authorizationModeFactory } from './mode';
import { privilegesFactory } from './privileges';
import { AuthorizationService } from '.';

import {
  coreMock,
  elasticsearchServiceMock,
  loggingSystemMock,
} from '../../../../../src/core/server/mocks';
import { featuresPluginMock } from '../../../features/server/mocks';
import { licenseMock } from '../../common/licensing/index.mock';
import { SecurityLicense, SecurityLicenseFeatures } from '../../common/licensing';
import { nextTick } from 'test_utils/enzyme_helpers';

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
    status: mockCoreSetup.status,
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
  let statusSubject: BehaviorSubject<CoreStatus>;
  let licenseSubject: BehaviorSubject<SecurityLicenseFeatures>;
  let mockLicense: jest.Mocked<SecurityLicense>;
  beforeEach(() => {
    const mockClusterClient = elasticsearchServiceMock.createLegacyClusterClient();

    licenseSubject = new BehaviorSubject(({} as unknown) as SecurityLicenseFeatures);
    mockLicense = licenseMock.create();
    mockLicense.isEnabled.mockReturnValue(false);
    mockLicense.features$ = licenseSubject;

    statusSubject = new BehaviorSubject<CoreStatus>({
      elasticsearch: { level: ServiceStatusLevels.unavailable, summary: 'Service is NOT working' },
      savedObjects: { level: ServiceStatusLevels.unavailable, summary: 'Service is NOT working' },
    });
    const mockCoreSetup = coreMock.createSetup();
    mockCoreSetup.status.core$ = statusSubject;

    const authorizationService = new AuthorizationService();
    authorizationService.setup({
      http: mockCoreSetup.http,
      capabilities: mockCoreSetup.capabilities,
      status: mockCoreSetup.status,
      clusterClient: mockClusterClient,
      license: mockLicense,
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

    authorizationService.start({ clusterClient: mockClusterClient, features: featuresStart });

    // ES and license aren't available yet.
    expect(mockRegisterPrivilegesWithCluster).not.toHaveBeenCalled();
  });

  it('registers cluster privileges', async () => {
    // ES is available now, but not license.
    statusSubject.next({
      elasticsearch: { level: ServiceStatusLevels.available, summary: 'Service is working' },
      savedObjects: { level: ServiceStatusLevels.unavailable, summary: 'Service is NOT working' },
    });
    expect(mockRegisterPrivilegesWithCluster).not.toHaveBeenCalled();

    // Both ES and license are available now.
    mockLicense.isEnabled.mockReturnValue(true);
    licenseSubject.next(({} as unknown) as SecurityLicenseFeatures);
    expect(mockRegisterPrivilegesWithCluster).toHaveBeenCalledTimes(1);

    await nextTick();

    // New changes still trigger privileges re-registration.
    licenseSubject.next(({} as unknown) as SecurityLicenseFeatures);
    expect(mockRegisterPrivilegesWithCluster).toHaveBeenCalledTimes(2);
  });

  it('schedules retries if fails to register cluster privileges', async () => {
    jest.useFakeTimers();

    mockRegisterPrivilegesWithCluster.mockRejectedValue(new Error('Some error'));

    // Both ES and license are available.
    mockLicense.isEnabled.mockReturnValue(true);
    statusSubject.next({
      elasticsearch: { level: ServiceStatusLevels.available, summary: 'Service is working' },
      savedObjects: { level: ServiceStatusLevels.unavailable, summary: 'Service is NOT working' },
    });
    expect(mockRegisterPrivilegesWithCluster).toHaveBeenCalledTimes(1);

    // Next retry isn't performed immediately, retry happens only after a timeout.
    await nextTick();
    expect(mockRegisterPrivilegesWithCluster).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(100);
    expect(mockRegisterPrivilegesWithCluster).toHaveBeenCalledTimes(2);

    // Delay between consequent retries is increasing.
    await nextTick();
    jest.advanceTimersByTime(100);
    expect(mockRegisterPrivilegesWithCluster).toHaveBeenCalledTimes(2);
    await nextTick();
    jest.advanceTimersByTime(100);
    expect(mockRegisterPrivilegesWithCluster).toHaveBeenCalledTimes(3);

    // When call finally succeeds retries aren't scheduled anymore.
    mockRegisterPrivilegesWithCluster.mockResolvedValue(undefined);
    await nextTick();
    jest.runAllTimers();
    expect(mockRegisterPrivilegesWithCluster).toHaveBeenCalledTimes(4);
    await nextTick();
    jest.runAllTimers();
    expect(mockRegisterPrivilegesWithCluster).toHaveBeenCalledTimes(4);

    // New changes still trigger privileges re-registration.
    licenseSubject.next(({} as unknown) as SecurityLicenseFeatures);
    expect(mockRegisterPrivilegesWithCluster).toHaveBeenCalledTimes(5);
  });
});

it('#stop unsubscribes from license and ES updates.', () => {
  const mockClusterClient = elasticsearchServiceMock.createLegacyClusterClient();

  const licenseSubject = new BehaviorSubject(({} as unknown) as SecurityLicenseFeatures);
  const mockLicense = licenseMock.create();
  mockLicense.isEnabled.mockReturnValue(false);
  mockLicense.features$ = licenseSubject;

  const mockCoreSetup = coreMock.createSetup();
  mockCoreSetup.status.core$ = new BehaviorSubject<CoreStatus>({
    elasticsearch: { level: ServiceStatusLevels.available, summary: 'Service is working' },
    savedObjects: { level: ServiceStatusLevels.available, summary: 'Service is working' },
  });

  const authorizationService = new AuthorizationService();
  authorizationService.setup({
    http: mockCoreSetup.http,
    capabilities: mockCoreSetup.capabilities,
    status: mockCoreSetup.status,
    clusterClient: mockClusterClient,
    license: mockLicense,
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
  authorizationService.start({ clusterClient: mockClusterClient, features: featuresStart });

  authorizationService.stop();

  // After stop we don't register privileges even if all requirements are met.
  mockLicense.isEnabled.mockReturnValue(true);
  licenseSubject.next(({} as unknown) as SecurityLicenseFeatures);
  expect(mockRegisterPrivilegesWithCluster).not.toHaveBeenCalled();
});
