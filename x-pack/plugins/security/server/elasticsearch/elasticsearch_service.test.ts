/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject } from 'rxjs';
import {
  ILegacyCustomClusterClient,
  ServiceStatusLevels,
  CoreStatus,
} from '../../../../../src/core/server';
import { SecurityLicense, SecurityLicenseFeatures } from '../../common/licensing';
import { elasticsearchClientPlugin } from './elasticsearch_client_plugin';
import { ElasticsearchService } from './elasticsearch_service';

import {
  coreMock,
  elasticsearchServiceMock,
  loggingSystemMock,
} from '../../../../../src/core/server/mocks';
import { licenseMock } from '../../common/licensing/index.mock';
import { nextTick } from 'test_utils/enzyme_helpers';

describe('ElasticsearchService', () => {
  let service: ElasticsearchService;
  beforeEach(() => {
    service = new ElasticsearchService(loggingSystemMock.createLogger());
  });

  describe('setup()', () => {
    it('exposes proper contract', () => {
      const mockCoreSetup = coreMock.createSetup();
      const mockClusterClient = elasticsearchServiceMock.createLegacyCustomClusterClient();
      mockCoreSetup.elasticsearch.legacy.createClient.mockReturnValue(mockClusterClient);

      expect(
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

  describe('start()', () => {
    let mockClusterClient: ILegacyCustomClusterClient;
    let mockLicense: jest.Mocked<SecurityLicense>;
    let mockStatusSubject: BehaviorSubject<CoreStatus>;
    let mockLicenseSubject: BehaviorSubject<SecurityLicenseFeatures>;
    beforeEach(() => {
      const mockCoreSetup = coreMock.createSetup();
      mockClusterClient = elasticsearchServiceMock.createLegacyCustomClusterClient();
      mockCoreSetup.elasticsearch.legacy.createClient.mockReturnValue(mockClusterClient);

      mockLicenseSubject = new BehaviorSubject(({} as unknown) as SecurityLicenseFeatures);
      mockLicense = licenseMock.create();
      mockLicense.isEnabled.mockReturnValue(false);
      mockLicense.features$ = mockLicenseSubject;

      mockStatusSubject = new BehaviorSubject<CoreStatus>({
        elasticsearch: {
          level: ServiceStatusLevels.unavailable,
          summary: 'Service is NOT working',
        },
        savedObjects: { level: ServiceStatusLevels.unavailable, summary: 'Service is NOT working' },
      });
      mockCoreSetup.status.core$ = mockStatusSubject;

      service.setup({
        elasticsearch: mockCoreSetup.elasticsearch,
        status: mockCoreSetup.status,
        license: mockLicense,
      });
    });

    it('exposes proper contract', () => {
      expect(service.start()).toEqual({
        clusterClient: mockClusterClient,
        watchOnlineStatus$: expect.any(Function),
      });
    });

    it('`watchOnlineStatus$` allows tracking of Elasticsearch status', () => {
      const mockHandler = jest.fn();
      service.start().watchOnlineStatus$().subscribe(mockHandler);

      // Neither ES nor license is available yet.
      expect(mockHandler).not.toHaveBeenCalled();

      // ES is available now, but not license.
      mockStatusSubject.next({
        elasticsearch: { level: ServiceStatusLevels.available, summary: 'Service is working' },
        savedObjects: { level: ServiceStatusLevels.unavailable, summary: 'Service is NOT working' },
      });
      expect(mockHandler).not.toHaveBeenCalled();

      // Both ES and license are available.
      mockLicense.isEnabled.mockReturnValue(true);
      mockStatusSubject.next({
        elasticsearch: { level: ServiceStatusLevels.available, summary: 'Service is working' },
        savedObjects: { level: ServiceStatusLevels.unavailable, summary: 'Service is NOT working' },
      });
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });

    it('`watchOnlineStatus$` allows to schedule retry', async () => {
      jest.useFakeTimers();

      // Both ES and license are available.
      mockLicense.isEnabled.mockReturnValue(true);
      mockStatusSubject.next({
        elasticsearch: { level: ServiceStatusLevels.available, summary: 'Service is working' },
        savedObjects: { level: ServiceStatusLevels.unavailable, summary: 'Service is NOT working' },
      });

      const mockHandler = jest.fn();
      service.start().watchOnlineStatus$().subscribe(mockHandler);
      expect(mockHandler).toHaveBeenCalledTimes(1);

      const [[{ scheduleRetry }]] = mockHandler.mock.calls;

      // Next retry isn't performed immediately, retry happens only after a timeout.
      scheduleRetry();
      await nextTick();
      expect(mockHandler).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(100);
      expect(mockHandler).toHaveBeenCalledTimes(2);

      // Delay between consequent retries is increasing.
      scheduleRetry();
      await nextTick();
      jest.advanceTimersByTime(100);
      expect(mockHandler).toHaveBeenCalledTimes(2);
      await nextTick();
      jest.advanceTimersByTime(100);
      expect(mockHandler).toHaveBeenCalledTimes(3);

      // Delay between consequent retries is increasing.
      scheduleRetry();
      await nextTick();
      jest.advanceTimersByTime(200);
      expect(mockHandler).toHaveBeenCalledTimes(3);
      await nextTick();
      jest.advanceTimersByTime(100);
      expect(mockHandler).toHaveBeenCalledTimes(4);

      // If `scheduleRetry` isn't called retries aren't scheduled anymore.
      await nextTick();
      jest.runAllTimers();
      expect(mockHandler).toHaveBeenCalledTimes(4);

      // New changes still trigger handler once again and reset retry timer.
      mockLicenseSubject.next(({} as unknown) as SecurityLicenseFeatures);
      expect(mockHandler).toHaveBeenCalledTimes(5);

      // Retry timer is reset.
      scheduleRetry();
      await nextTick();
      expect(mockHandler).toHaveBeenCalledTimes(5);
      jest.advanceTimersByTime(100);
      expect(mockHandler).toHaveBeenCalledTimes(6);
    });

    it('`watchOnlineStatus$` cancels scheduled retry if status changes before retry timeout fires', async () => {
      jest.useFakeTimers();

      // Both ES and license are available.
      mockLicense.isEnabled.mockReturnValue(true);
      mockStatusSubject.next({
        elasticsearch: { level: ServiceStatusLevels.available, summary: 'Service is working' },
        savedObjects: { level: ServiceStatusLevels.unavailable, summary: 'Service is NOT working' },
      });

      const mockHandler = jest.fn();
      service.start().watchOnlineStatus$().subscribe(mockHandler);
      expect(mockHandler).toHaveBeenCalledTimes(1);

      const [[{ scheduleRetry }]] = mockHandler.mock.calls;

      // Schedule a retry.
      scheduleRetry();
      await nextTick();
      expect(mockHandler).toHaveBeenCalledTimes(1);

      // New changes should immediately call handler.
      mockLicenseSubject.next(({} as unknown) as SecurityLicenseFeatures);
      expect(mockHandler).toHaveBeenCalledTimes(2);

      // Retry timeout should have been cancelled.
      await nextTick();
      jest.runAllTimers();
      expect(mockHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('stop()', () => {
    it('properly closes cluster client instance', () => {
      const mockCoreSetup = coreMock.createSetup();
      const mockClusterClient = elasticsearchServiceMock.createLegacyCustomClusterClient();
      mockCoreSetup.elasticsearch.legacy.createClient.mockReturnValue(mockClusterClient);

      service.setup({
        elasticsearch: mockCoreSetup.elasticsearch,
        status: mockCoreSetup.status,
        license: licenseMock.create(),
      });

      expect(mockClusterClient.close).not.toHaveBeenCalled();

      service.stop();

      expect(mockClusterClient.close).toHaveBeenCalledTimes(1);
    });
  });
});
