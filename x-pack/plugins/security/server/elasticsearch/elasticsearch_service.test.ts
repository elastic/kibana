/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { elasticsearchClientPlugin } from './elasticsearch_client_plugin';
import { ElasticsearchService } from './elasticsearch_service';

import {
  coreMock,
  elasticsearchServiceMock,
  loggingSystemMock,
} from '../../../../../src/core/server/mocks';
import { licenseMock } from '../../common/licensing/index.mock';

describe('ElasticsearchService', () => {
  let service: ElasticsearchService;
  beforeEach(() => {
    service = new ElasticsearchService(loggingSystemMock.createLogger());
  });

  describe('setup()', () => {
    it('exposes proper contract', async () => {
      const mockCoreSetup = coreMock.createSetup();
      const mockClusterClient = elasticsearchServiceMock.createLegacyCustomClusterClient();
      mockCoreSetup.elasticsearch.legacy.createClient.mockReturnValue(mockClusterClient);

      await expect(
        service.setup({
          elasticsearch: mockCoreSetup.elasticsearch,
          status: mockCoreSetup.status,
          license: licenseMock.create(),
        })
      ).toEqual({ clusterClient: mockClusterClient });

      expect(mockCoreSetup.elasticsearch.legacy.createClient).toHaveBeenCalledTimes(1);
      expect(mockCoreSetup.elasticsearch.legacy.createClient).toHaveBeenCalledWith('security', {
        plugins: [elasticsearchClientPlugin],
      });
    });
  });

  describe('start', () => {
    /*
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
});*/
  });

  describe('stop()', () => {
    it('properly closes cluster client instance', async () => {
      const mockCoreSetup = coreMock.createSetup();
      const mockClusterClient = elasticsearchServiceMock.createLegacyCustomClusterClient();
      mockCoreSetup.elasticsearch.legacy.createClient.mockReturnValue(mockClusterClient);

      service.setup({
        elasticsearch: mockCoreSetup.elasticsearch,
        status: mockCoreSetup.status,
        license: licenseMock.create(),
      });

      expect(mockClusterClient.close).not.toHaveBeenCalled();

      await service.stop();

      expect(mockClusterClient.close).toHaveBeenCalledTimes(1);
    });
  });
});
