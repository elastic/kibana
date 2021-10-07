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

import { SynchronizationLogic, emptyBlockedWindow } from './synchronization_logic';

describe('SynchronizationLogic', () => {
  const { http } = mockHttpValues;
  const { flashAPIErrors, flashSuccessToast } = mockFlashMessageHelpers;
  const { navigateToUrl } = mockKibanaValues;
  const { mount } = new LogicMounter(SynchronizationLogic);
  const contentSource = fullContentSources[0];

  const defaultValues = {
    navigatingBetweenTabs: false,
    hasUnsavedObjectsAndAssetsChanges: false,
    contentExtractionChecked: true,
    thumbnailsChecked: true,
    blockedWindows: [],
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
      it('calls API and sets values for false value', async () => {
        const setContentSourceSpy = jest.spyOn(SourceLogic.actions, 'setContentSource');
        const promise = Promise.resolve(contentSource);
        http.patch.mockReturnValue(promise);
        SynchronizationLogic.actions.updateSyncEnabled(false);

        expect(http.patch).toHaveBeenCalledWith(
          '/internal/workplace_search/org/sources/123/settings',
          {
            body: JSON.stringify({
              content_source: {
                indexing: { enabled: false },
              },
            }),
          }
        );
        await promise;
        expect(setContentSourceSpy).toHaveBeenCalledWith(contentSource);
        expect(flashSuccessToast).toHaveBeenCalledWith('Source synchronization disabled.');
      });

      it('calls API and sets values for true value', async () => {
        const promise = Promise.resolve(contentSource);
        http.patch.mockReturnValue(promise);
        SynchronizationLogic.actions.updateSyncEnabled(true);

        expect(http.patch).toHaveBeenCalledWith(
          '/internal/workplace_search/org/sources/123/settings',
          {
            body: JSON.stringify({
              content_source: {
                indexing: { enabled: true },
              },
            }),
          }
        );
        await promise;
        expect(flashSuccessToast).toHaveBeenCalledWith('Source synchronization enabled.');
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
        SynchronizationLogic.actions.updateSyncEnabled(false);
        await expectedAsyncError(promise);

        expect(flashAPIErrors).toHaveBeenCalledWith(error);
      });
    });

    describe('resetSyncSettings', () => {
      it('calls methods', async () => {
        const setThumbnailsCheckedSpy = jest.spyOn(
          SynchronizationLogic.actions,
          'setThumbnailsChecked'
        );
        const setContentExtractionCheckedSpy = jest.spyOn(
          SynchronizationLogic.actions,
          'setContentExtractionChecked'
        );
        SynchronizationLogic.actions.resetSyncSettings();

        expect(setThumbnailsCheckedSpy).toHaveBeenCalledWith(true);
        expect(setContentExtractionCheckedSpy).toHaveBeenCalledWith(true);
      });
    });

    describe('updateSyncSettings', () => {
      it('calls API and sets values', async () => {
        const setContentSourceSpy = jest.spyOn(SourceLogic.actions, 'setContentSource');
        const promise = Promise.resolve(contentSource);
        http.patch.mockReturnValue(promise);
        SynchronizationLogic.actions.updateSyncSettings();

        expect(http.patch).toHaveBeenCalledWith(
          '/internal/workplace_search/org/sources/123/settings',
          {
            body: JSON.stringify({
              content_source: {
                indexing: {
                  features: {
                    content_extraction: { enabled: true },
                    thumbnails: { enabled: true },
                  },
                },
              },
            }),
          }
        );
        await promise;
        expect(setContentSourceSpy).toHaveBeenCalledWith(contentSource);
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
        SynchronizationLogic.actions.updateSyncSettings();
        await expectedAsyncError(promise);

        expect(flashAPIErrors).toHaveBeenCalledWith(error);
      });
    });
  });
});
