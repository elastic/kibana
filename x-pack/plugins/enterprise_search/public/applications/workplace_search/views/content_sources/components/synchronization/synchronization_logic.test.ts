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

  const defaultValues = {
    navigatingBetweenTabs: false,
    hasUnsavedObjectsAndAssetsChanges: false,
    hasUnsavedFrequencyChanges: false,
    contentExtractionChecked: true,
    thumbnailsChecked: true,
    blockedWindows: [],
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

    it('addBlockedWindow', () => {
      SynchronizationLogic.actions.addBlockedWindow();

      expect(SynchronizationLogic.values.blockedWindows).toEqual([emptyBlockedWindow]);
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
