/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';

import type { CoreStatus } from '@kbn/core/server';
import { ServiceStatusLevels } from '@kbn/core/server';
import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { nextTick } from '@kbn/test-jest-helpers';

import type { SecurityLicense, SecurityLicenseFeatures } from '../../common/licensing';
import { licenseMock } from '../../common/licensing/index.mock';
import { ElasticsearchService } from './elasticsearch_service';

describe('ElasticsearchService', () => {
  let service: ElasticsearchService;
  beforeEach(() => {
    service = new ElasticsearchService(loggingSystemMock.createLogger());
  });

  describe('setup()', () => {
    it('exposes proper contract', () => {
      expect(
        service.setup({
          status: coreMock.createSetup().status,
          license: licenseMock.create(),
        })
      ).toBeUndefined();
    });
  });

  describe('start()', () => {
    let mockLicense: jest.Mocked<SecurityLicense>;
    let mockStatusSubject: BehaviorSubject<CoreStatus>;
    let mockLicenseSubject: BehaviorSubject<SecurityLicenseFeatures>;
    beforeEach(() => {
      mockLicenseSubject = new BehaviorSubject({} as unknown as SecurityLicenseFeatures);
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

      const mockStatus = coreMock.createSetup().status;
      mockStatus.core$ = mockStatusSubject;

      service.setup({
        status: mockStatus,
        license: mockLicense,
      });
    });

    it('exposes proper contract', () => {
      expect(service.start()).toEqual({ watchOnlineStatus$: expect.any(Function) });
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
      mockLicenseSubject.next({} as unknown as SecurityLicenseFeatures);
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
      mockLicenseSubject.next({} as unknown as SecurityLicenseFeatures);
      expect(mockHandler).toHaveBeenCalledTimes(2);

      // Retry timeout should have been cancelled.
      await nextTick();
      jest.runAllTimers();
      expect(mockHandler).toHaveBeenCalledTimes(2);
    });
  });
});
