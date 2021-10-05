/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';
import moment from 'moment';

export type TabId = 'source_sync_frequency' | 'blocked_time_windows';

import { flashAPIErrors, flashSuccessToast } from '../../../../../shared/flash_messages';
import { HttpLogic } from '../../../../../shared/http';
import { KibanaLogic } from '../../../../../shared/kibana';
import { AppLogic } from '../../../../app_logic';
import {
  SYNC_FREQUENCY_PATH,
  BLOCKED_TIME_WINDOWS_PATH,
  getContentSourcePath,
} from '../../../../routes';
import { BlockedWindow } from '../../../../types';

import {
  SYNC_ENABLED_MESSAGE,
  SYNC_DISABLED_MESSAGE,
  SYNC_SETTINGS_UPDATED_MESSAGE,
} from '../../constants';
import { SourceLogic } from '../../source_logic';

interface SynchronizationActions {
  setNavigatingBetweenTabs(navigatingBetweenTabs: boolean): boolean;
  handleSelectedTabChanged(tabId: TabId): TabId;
  addBlockedWindow(): void;
  updateSyncSettings(): void;
  resetSyncSettings(): void;
  updateSyncEnabled(enabled: boolean): boolean;
  setThumbnailsChecked(checked: boolean): boolean;
  setContentExtractionChecked(checked: boolean): boolean;
}

interface SynchronizationValues {
  navigatingBetweenTabs: boolean;
  hasUnsavedFrequencyChanges: boolean;
  hasUnsavedObjectsAndAssetsChanges: boolean;
  thumbnailsChecked: boolean;
  contentExtractionChecked: boolean;
  blockedWindows: BlockedWindow[];
}

export const emptyBlockedWindow: BlockedWindow = {
  jobType: 'full',
  day: 'monday',
  start: moment().set('hour', 11).set('minutes', 0),
  end: moment().set('hour', 13).set('minutes', 0),
};

export const SynchronizationLogic = kea<
  MakeLogicType<SynchronizationValues, SynchronizationActions>
>({
  path: ['enterprise_search', 'workplace_search', 'synchronization_logic'],
  actions: {
    setNavigatingBetweenTabs: (navigatingBetweenTabs: boolean) => navigatingBetweenTabs,
    handleSelectedTabChanged: (tabId: TabId) => tabId,
    updateSyncEnabled: (enabled: boolean) => enabled,
    setThumbnailsChecked: (checked: boolean) => checked,
    setContentExtractionChecked: (checked: boolean) => checked,
    updateSyncSettings: true,
    resetSyncSettings: true,
    addBlockedWindow: true,
  },
  reducers: ({ props }) => ({
    navigatingBetweenTabs: [
      false,
      {
        setNavigatingBetweenTabs: (_, navigatingBetweenTabs) => navigatingBetweenTabs,
      },
    ],
    blockedWindows: [
      [],
      {
        addBlockedWindow: (state, _) => [...state, emptyBlockedWindow],
      },
    ],
    thumbnailsChecked: [
      props.contentSource.indexing.features.thumbnails.enabled,
      {
        setThumbnailsChecked: (_, thumbnailsChecked) => thumbnailsChecked,
      },
    ],
    contentExtractionChecked: [
      props.contentSource.indexing.features.contentExtraction.enabled,
      {
        setContentExtractionChecked: (_, contentExtractionChecked) => contentExtractionChecked,
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    hasUnsavedObjectsAndAssetsChanges: [
      () => [
        selectors.thumbnailsChecked,
        selectors.contentExtractionChecked,
        (_, props) => props.contentSource,
      ],
      (thumbnailsChecked, contentExtractionChecked, contentSource) => {
        const {
          indexing: {
            features: {
              thumbnails: { enabled: thumbnailsEnabled },
              contentExtraction: { enabled: contentExtractionEnabled },
            },
          },
        } = contentSource;

        return (
          thumbnailsChecked !== thumbnailsEnabled ||
          contentExtractionChecked !== contentExtractionEnabled
        );
      },
    ],
  }),
  listeners: ({ actions, values, props }) => ({
    handleSelectedTabChanged: async (tabId, breakpoint) => {
      const { isOrganization } = AppLogic.values;
      const { id: sourceId } = props.contentSource;
      const path =
        tabId === 'source_sync_frequency'
          ? getContentSourcePath(SYNC_FREQUENCY_PATH, sourceId, isOrganization)
          : getContentSourcePath(BLOCKED_TIME_WINDOWS_PATH, sourceId, isOrganization);

      // This method is needed because the shared `UnsavedChangesPrompt` component is triggered
      // when navigating between tabs. We set a boolean flag that tells the prompt there are no
      // unsaved changes when navigating between the tabs and reset it one the transition is complete
      // in order to restore the intended functionality when navigating away with unsaved changes.
      actions.setNavigatingBetweenTabs(true);

      await breakpoint();

      KibanaLogic.values.navigateToUrl(path);
      actions.setNavigatingBetweenTabs(false);
    },
    updateSyncEnabled: async (enabled) => {
      const { id: sourceId } = props.contentSource;
      const route = `/internal/workplace_search/org/sources/${sourceId}/settings`;
      const successMessage = enabled ? SYNC_ENABLED_MESSAGE : SYNC_DISABLED_MESSAGE;

      try {
        const response = await HttpLogic.values.http.patch(route, {
          body: JSON.stringify({ content_source: { indexing: { enabled } } }),
        });

        SourceLogic.actions.setContentSource(response);
        flashSuccessToast(successMessage);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    resetSyncSettings: () => {
      actions.setThumbnailsChecked(props.contentSource.indexing.features.thumbnails.enabled);
      actions.setContentExtractionChecked(
        props.contentSource.indexing.features.contentExtraction.enabled
      );
    },
    updateSyncSettings: async () => {
      const { id: sourceId } = props.contentSource;
      const route = `/internal/workplace_search/org/sources/${sourceId}/settings`;

      try {
        const response = await HttpLogic.values.http.patch(route, {
          body: JSON.stringify({
            content_source: {
              indexing: {
                features: {
                  content_extraction: { enabled: values.contentExtractionChecked },
                  thumbnails: { enabled: values.thumbnailsChecked },
                },
              },
            },
          }),
        });

        SourceLogic.actions.setContentSource(response);
        flashSuccessToast(SYNC_SETTINGS_UPDATED_MESSAGE);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
