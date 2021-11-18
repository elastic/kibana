/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockFlashMessageHelpers,
  mockHttpValues,
  mockKibanaValues,
} from '../../../../../__mocks__/kea_logic';
import { fullContentSources } from '../../../../__mocks__/content_sources.mock';

import { nextTick } from '@kbn/test/jest';

import { expectedAsyncError } from '../../../../../test_helpers';

jest.mock('../../source_logic', () => ({
  SourceLogic: { actions: { setContentSource: jest.fn() } },
}));
import { SourceLogic } from '../../source_logic';

jest.mock('../../../../app_logic', () => ({
  AppLogic: { values: { isOrganization: true } },
}));

import {
  SynchronizationLogic,
  emptyBlockedWindow,
  stripScheduleSeconds,
} from './synchronization_logic';

describe('SynchronizationLogic', () => {
  const { http } = mockHttpValues;
  const { flashAPIErrors, flashSuccessToast } = mockFlashMessageHelpers;
  const { navigateToUrl } = mockKibanaValues;
  const { mount } = new LogicMounter(SynchronizationLogic);
  const contentSource = fullContentSources[0];
  const sourceWithNoBlockedWindows = {
    ...contentSource,
    indexing: {
      ...contentSource.indexing,
      schedule: {
        ...contentSource.indexing.schedule,
        blockedWindows: undefined,
      },
    },
  };

  const defaultValues = {
    navigatingBetweenTabs: false,
    hasUnsavedObjectsAndAssetsChanges: false,
    hasUnsavedFrequencyChanges: false,
    contentExtractionChecked: true,
    thumbnailsChecked: true,
    schedule: contentSource.indexing.schedule,
    cachedSchedule: contentSource.indexing.schedule,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mount({}, { contentSource });
  });

  it('has expected default values', () => {
    expect(SynchronizationLogic.values).toEqual(defaultValues);
  });

  describe('actions', () => {
    it('setNavigatingBetweenTabs', () => {
      SynchronizationLogic.actions.setNavigatingBetweenTabs(true);

      expect(SynchronizationLogic.values.navigatingBetweenTabs).toEqual(true);
    });

    describe('addBlockedWindow', () => {
      it('creates and populates empty array when undefined', () => {
        mount({}, { contentSource: sourceWithNoBlockedWindows });
        SynchronizationLogic.actions.addBlockedWindow();

        expect(SynchronizationLogic.values.schedule.blockedWindows).toEqual([emptyBlockedWindow]);
      });

      it('adds item when list has items', () => {
        SynchronizationLogic.actions.addBlockedWindow();
        SynchronizationLogic.actions.addBlockedWindow();

        expect(SynchronizationLogic.values.schedule.blockedWindows).toEqual([
          emptyBlockedWindow,
          emptyBlockedWindow,
        ]);
      });
    });

    it('setThumbnailsChecked', () => {
      SynchronizationLogic.actions.setThumbnailsChecked(false);

      expect(SynchronizationLogic.values.thumbnailsChecked).toEqual(false);
    });

    it('setContentExtractionChecked', () => {
      SynchronizationLogic.actions.setContentExtractionChecked(false);

      expect(SynchronizationLogic.values.contentExtractionChecked).toEqual(false);
    });

    it('resetSyncSettings', () => {
      SynchronizationLogic.actions.setContentExtractionChecked(false);
      SynchronizationLogic.actions.setThumbnailsChecked(false);
      SynchronizationLogic.actions.resetSyncSettings();

      expect(SynchronizationLogic.values.thumbnailsChecked).toEqual(true);
      expect(SynchronizationLogic.values.contentExtractionChecked).toEqual(true);
    });

    describe('setSyncFrequency', () => {
      it('sets "days"', () => {
        SynchronizationLogic.actions.setSyncFrequency('full', '1', 'days');

        expect(SynchronizationLogic.values.schedule.full).toEqual('P1D');
      });

      it('sets "hours"', () => {
        SynchronizationLogic.actions.setSyncFrequency('full', '10', 'hours');

        expect(SynchronizationLogic.values.schedule.full).toEqual('P1DT10H');
      });

      it('sets "minutes"', () => {
        SynchronizationLogic.actions.setSyncFrequency('full', '30', 'minutes');

        expect(SynchronizationLogic.values.schedule.full).toEqual('P1DT30M');
      });
    });

    describe('removeBlockedWindow', () => {
      it('removes window', () => {
        SynchronizationLogic.actions.addBlockedWindow();
        SynchronizationLogic.actions.addBlockedWindow();
        SynchronizationLogic.actions.removeBlockedWindow(0);

        expect(SynchronizationLogic.values.schedule.blockedWindows).toEqual([emptyBlockedWindow]);
      });

      it('returns "undefined" when last window removed', () => {
        SynchronizationLogic.actions.addBlockedWindow();
        SynchronizationLogic.actions.removeBlockedWindow(0);

        expect(SynchronizationLogic.values.schedule.blockedWindows).toBeUndefined();
      });
    });
  });

  describe('setBlockedTimeWindow', () => {
    it('sets "jobType"', () => {
      SynchronizationLogic.actions.addBlockedWindow();
      SynchronizationLogic.actions.setBlockedTimeWindow(0, 'jobType', 'incremental');

      expect(SynchronizationLogic.values.schedule.blockedWindows![0].jobType).toEqual(
        'incremental'
      );
    });

    it('sets "day"', () => {
      SynchronizationLogic.actions.addBlockedWindow();
      SynchronizationLogic.actions.setBlockedTimeWindow(0, 'day', 'tuesday');

      expect(SynchronizationLogic.values.schedule.blockedWindows![0].day).toEqual('tuesday');
    });

    it('sets "start"', () => {
      SynchronizationLogic.actions.addBlockedWindow();
      SynchronizationLogic.actions.setBlockedTimeWindow(0, 'start', '9:00:00Z');

      expect(SynchronizationLogic.values.schedule.blockedWindows![0].start).toEqual('9:00:00Z');
    });

    it('sets "end"', () => {
      SynchronizationLogic.actions.addBlockedWindow();
      SynchronizationLogic.actions.setBlockedTimeWindow(0, 'end', '11:00:00Z');

      expect(SynchronizationLogic.values.schedule.blockedWindows![0].end).toEqual('11:00:00Z');
    });
  });

  describe('listeners', () => {
    describe('handleSelectedTabChanged', () => {
      it('calls setNavigatingBetweenTabs', async () => {
        const setNavigatingBetweenTabsSpy = jest.spyOn(
          SynchronizationLogic.actions,
          'setNavigatingBetweenTabs'
        );
        SynchronizationLogic.actions.handleSelectedTabChanged('source_sync_frequency');
        await nextTick();

        expect(setNavigatingBetweenTabsSpy).toHaveBeenCalledWith(true);
        expect(navigateToUrl).toHaveBeenCalledWith('/sources/123/synchronization/frequency');
      });

      it('calls calls correct route for "blocked_time_windows"', async () => {
        SynchronizationLogic.actions.handleSelectedTabChanged('blocked_time_windows');
        await nextTick();

        expect(navigateToUrl).toHaveBeenCalledWith(
          '/sources/123/synchronization/frequency/blocked_windows'
        );
      });
    });

    describe('updateSyncEnabled', () => {
      it('calls updateServerSettings method', async () => {
        const updateServerSettingsSpy = jest.spyOn(
          SynchronizationLogic.actions,
          'updateServerSettings'
        );
        SynchronizationLogic.actions.updateSyncEnabled(false);

        expect(updateServerSettingsSpy).toHaveBeenCalledWith({
          content_source: {
            indexing: { enabled: false },
          },
        });
      });
    });

    describe('updateObjectsAndAssetsSettings', () => {
      it('calls updateServerSettings method', async () => {
        const updateServerSettingsSpy = jest.spyOn(
          SynchronizationLogic.actions,
          'updateServerSettings'
        );
        SynchronizationLogic.actions.updateObjectsAndAssetsSettings();

        expect(updateServerSettingsSpy).toHaveBeenCalledWith({
          content_source: {
            indexing: {
              features: {
                content_extraction: { enabled: true },
                thumbnails: { enabled: true },
              },
            },
          },
        });
      });
    });

    describe('updateFrequencySettings', () => {
      it('calls updateServerSettings method', async () => {
        SynchronizationLogic.actions.addBlockedWindow();
        const updateServerSettingsSpy = jest.spyOn(
          SynchronizationLogic.actions,
          'updateServerSettings'
        );
        SynchronizationLogic.actions.updateFrequencySettings();

        expect(updateServerSettingsSpy).toHaveBeenCalledWith({
          content_source: {
            indexing: {
              schedule: {
                full: 'P1D',
                incremental: 'PT2H',
                delete: 'PT10M',
                blocked_windows: [
                  {
                    day: 'monday',
                    end: '13:00:00Z',
                    job_type: 'full',
                    start: '11:00:00Z',
                  },
                ],
              },
            },
          },
        });
      });

      it('handles case where blockedWindows undefined', async () => {
        const updateServerSettingsSpy = jest.spyOn(
          SynchronizationLogic.actions,
          'updateServerSettings'
        );
        SynchronizationLogic.actions.updateFrequencySettings();

        expect(updateServerSettingsSpy).toHaveBeenCalledWith({
          content_source: {
            indexing: {
              schedule: {
                full: 'P1D',
                incremental: 'PT2H',
                delete: 'PT10M',
                blocked_windows: [],
              },
            },
          },
        });
      });
    });

    describe('updateServerSettings', () => {
      const body = {
        content_source: {
          indexing: {
            features: {
              content_extraction: { enabled: true },
              thumbnails: { enabled: true },
            },
          },
        },
      };
      it('calls API and sets values', async () => {
        const setContentSourceSpy = jest.spyOn(SourceLogic.actions, 'setContentSource');
        const setServerScheduleSpy = jest.spyOn(SynchronizationLogic.actions, 'setServerSchedule');
        const promise = Promise.resolve(contentSource);
        http.patch.mockReturnValue(promise);
        SynchronizationLogic.actions.updateServerSettings(body);

        expect(http.patch).toHaveBeenCalledWith(
          '/internal/workplace_search/org/sources/123/settings',
          {
            body: JSON.stringify(body),
          }
        );
        await promise;
        expect(setContentSourceSpy).toHaveBeenCalledWith(contentSource);
        expect(setServerScheduleSpy).toHaveBeenCalledWith(contentSource.indexing.schedule);
        expect(flashSuccessToast).toHaveBeenCalledWith('Source synchronization settings updated.');
      });

      it('handles error', async () => {
        const error = {
          response: {
            error: 'this is an error',
            status: 400,
          },
        };
        const promise = Promise.reject(error);
        http.patch.mockReturnValue(promise);
        SynchronizationLogic.actions.updateServerSettings(body);
        await expectedAsyncError(promise);

        expect(flashAPIErrors).toHaveBeenCalledWith(error);
      });
    });
  });

  describe('stripScheduleSeconds', () => {
    it('handles case where permissions not present', () => {
      const schedule = {
        full: 'P3D',
        incremental: 'P5D',
        delete: 'PT2H',
      };
      const stripped = stripScheduleSeconds(schedule as any);

      expect(stripped.permissions).toBeUndefined();
    });
  });
});
