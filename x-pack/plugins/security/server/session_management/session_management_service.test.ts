/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Subject } from 'rxjs';
import { ConfigSchema, createConfig } from '../config';
import { OnlineStatusRetryScheduler } from '../elasticsearch';
import { SessionManagementService } from './session_management_service';
import { Session } from './session';

import {
  coreMock,
  elasticsearchServiceMock,
  loggingSystemMock,
} from '../../../../../src/core/server/mocks';
import { nextTick } from 'test_utils/enzyme_helpers';
import { SessionIndex } from './session_index';

describe('SessionManagementService', () => {
  let service: SessionManagementService;
  beforeEach(() => {
    service = new SessionManagementService(loggingSystemMock.createLogger());
  });

  describe('setup()', () => {
    it('exposes proper contract', () => {
      const mockCoreSetup = coreMock.createSetup();

      expect(
        service.setup({
          clusterClient: elasticsearchServiceMock.createLegacyClusterClient(),
          http: mockCoreSetup.http,
          config: createConfig(ConfigSchema.validate({}), loggingSystemMock.createLogger(), {
            isTLSEnabled: false,
          }),
        })
      ).toEqual({ session: expect.any(Session) });
    });
  });

  describe('start()', () => {
    let mockSessionIndexInitialize: jest.SpyInstance;
    beforeEach(() => {
      mockSessionIndexInitialize = jest.spyOn(SessionIndex.prototype, 'initialize');

      const mockCoreSetup = coreMock.createSetup();
      service.setup({
        clusterClient: elasticsearchServiceMock.createLegacyClusterClient(),
        http: mockCoreSetup.http,
        config: createConfig(ConfigSchema.validate({}), loggingSystemMock.createLogger(), {
          isTLSEnabled: false,
        }),
      });
    });

    afterEach(() => {
      mockSessionIndexInitialize.mockReset();
    });

    it('exposes proper contract', () => {
      const mockStatusSubject = new Subject<OnlineStatusRetryScheduler>();
      expect(service.start({ online$: mockStatusSubject.asObservable() })).toBeUndefined();
    });

    it('initializes session index when Elasticsearch goes online', async () => {
      const mockStatusSubject = new Subject<OnlineStatusRetryScheduler>();
      service.start({ online$: mockStatusSubject.asObservable() });

      // ES isn't online yet.
      expect(mockSessionIndexInitialize).not.toHaveBeenCalled();

      const mockScheduleRetry = jest.fn();
      mockStatusSubject.next({ scheduleRetry: mockScheduleRetry });
      await nextTick();
      expect(mockSessionIndexInitialize).toHaveBeenCalledTimes(1);

      mockStatusSubject.next({ scheduleRetry: mockScheduleRetry });
      await nextTick();
      expect(mockSessionIndexInitialize).toHaveBeenCalledTimes(2);

      expect(mockScheduleRetry).not.toHaveBeenCalled();
    });

    it('schedules retry if index initialization fails', async () => {
      const mockStatusSubject = new Subject<OnlineStatusRetryScheduler>();
      service.start({ online$: mockStatusSubject.asObservable() });

      mockSessionIndexInitialize.mockRejectedValue(new Error('ugh :/'));

      const mockScheduleRetry = jest.fn();
      mockStatusSubject.next({ scheduleRetry: mockScheduleRetry });
      await nextTick();
      expect(mockSessionIndexInitialize).toHaveBeenCalledTimes(1);
      expect(mockScheduleRetry).toHaveBeenCalledTimes(1);

      // Still fails.
      mockStatusSubject.next({ scheduleRetry: mockScheduleRetry });
      await nextTick();
      expect(mockSessionIndexInitialize).toHaveBeenCalledTimes(2);
      expect(mockScheduleRetry).toHaveBeenCalledTimes(2);

      // And finally succeeds, retry is not scheduled.
      mockSessionIndexInitialize.mockResolvedValue(undefined);

      mockStatusSubject.next({ scheduleRetry: mockScheduleRetry });
      await nextTick();
      expect(mockSessionIndexInitialize).toHaveBeenCalledTimes(3);
      expect(mockScheduleRetry).toHaveBeenCalledTimes(2);
    });
  });

  describe('stop()', () => {
    let mockSessionIndexInitialize: jest.SpyInstance;
    beforeEach(() => {
      mockSessionIndexInitialize = jest.spyOn(SessionIndex.prototype, 'initialize');

      const mockCoreSetup = coreMock.createSetup();
      service.setup({
        clusterClient: elasticsearchServiceMock.createLegacyClusterClient(),
        http: mockCoreSetup.http,
        config: createConfig(ConfigSchema.validate({}), loggingSystemMock.createLogger(), {
          isTLSEnabled: false,
        }),
      });
    });

    afterEach(() => {
      mockSessionIndexInitialize.mockReset();
    });

    it('properly unsubscribes from status updates', () => {
      const mockStatusSubject = new Subject<OnlineStatusRetryScheduler>();
      service.start({ online$: mockStatusSubject.asObservable() });

      service.stop();

      const mockScheduleRetry = jest.fn();
      mockStatusSubject.next({ scheduleRetry: mockScheduleRetry });

      expect(mockSessionIndexInitialize).not.toHaveBeenCalled();
      expect(mockScheduleRetry).not.toHaveBeenCalled();
    });
  });
});
