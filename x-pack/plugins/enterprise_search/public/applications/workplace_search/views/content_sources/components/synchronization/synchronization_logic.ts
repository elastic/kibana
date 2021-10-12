/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';
import { cloneDeep, isEqual } from 'lodash';
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
import { BlockedWindow, IndexingSchedule, SyncJobType, TimeUnit } from '../../../../types';

import { SYNC_SETTINGS_UPDATED_MESSAGE } from '../../constants';
import { SourceLogic } from '../../source_logic';

interface ServerBlockedWindow {
  job_type: string;
  day: string;
  start: string;
  end: string;
}

interface ServerSyncSettingsBody {
  content_source: {
    indexing: {
      enabled?: boolean;
      features?: {
        content_extraction: { enabled: boolean };
        thumbnails: { enabled: boolean };
      };
      schedule?: {
        full: string;
        incremental: string;
        delete: string;
        permissions?: string;
        blocked_windows?: ServerBlockedWindow[];
      };
    };
  };
}

interface SynchronizationActions {
  setNavigatingBetweenTabs(navigatingBetweenTabs: boolean): boolean;
  handleSelectedTabChanged(tabId: TabId): TabId;
  addBlockedWindow(): void;
  updateFrequencySettings(): void;
  updateObjectsAndAssetsSettings(): void;
  resetSyncSettings(): void;
  updateSyncEnabled(enabled: boolean): boolean;
  setThumbnailsChecked(checked: boolean): boolean;
  setSyncFrequency(
    type: SyncJobType,
    value: string,
    unit: TimeUnit
  ): { type: SyncJobType; value: number; unit: TimeUnit };
  setContentExtractionChecked(checked: boolean): boolean;
  setServerSchedule(schedule: IndexingSchedule): IndexingSchedule;
  updateServerSettings(body: ServerSyncSettingsBody): ServerSyncSettingsBody;
}

interface SynchronizationValues {
  navigatingBetweenTabs: boolean;
  hasUnsavedFrequencyChanges: boolean;
  hasUnsavedObjectsAndAssetsChanges: boolean;
  thumbnailsChecked: boolean;
  contentExtractionChecked: boolean;
  blockedWindows: BlockedWindow[];
  cachedSchedule: IndexingSchedule;
  schedule: IndexingSchedule;
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
    setSyncFrequency: (type: SyncJobType, value: string, unit: TimeUnit) => ({
      type,
      value,
      unit,
    }),
    setContentExtractionChecked: (checked: boolean) => checked,
    updateServerSettings: (body: ServerSyncSettingsBody) => body,
    setServerSchedule: (schedule: IndexingSchedule) => schedule,
    updateFrequencySettings: true,
    updateObjectsAndAssetsSettings: true,
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
      props.contentSource.indexing.schedule.blockedWindows || [],
      {
        addBlockedWindow: (state, _) => [...state, emptyBlockedWindow],
      },
    ],
    thumbnailsChecked: [
      props.contentSource.indexing.features.thumbnails.enabled,
      {
        setThumbnailsChecked: (_, thumbnailsChecked) => thumbnailsChecked,
        resetSyncSettings: () => props.contentSource.indexing.features.thumbnails.enabled,
      },
    ],
    contentExtractionChecked: [
      props.contentSource.indexing.features.contentExtraction.enabled,
      {
        setContentExtractionChecked: (_, contentExtractionChecked) => contentExtractionChecked,
        resetSyncSettings: () => props.contentSource.indexing.features.contentExtraction.enabled,
      },
    ],
    cachedSchedule: [
      stripScheduleSeconds(props.contentSource.indexing.schedule),
      {
        setServerSchedule: (_, schedule) => schedule,
      },
    ],
    schedule: [
      stripScheduleSeconds(props.contentSource.indexing.schedule),
      {
        resetSyncSettings: () => stripScheduleSeconds(props.contentSource.indexing.schedule),
        setServerSchedule: (_, schedule) => schedule,
        setSyncFrequency: (state, { type, value, unit }) => {
          let currentValue;
          const schedule = cloneDeep(state);
          const duration = schedule[type];

          switch (unit) {
            case 'days':
              currentValue = moment.duration(duration).days();
              break;
            case 'hours':
              currentValue = moment.duration(duration).hours();
              break;
            default:
              currentValue = moment.duration(duration).minutes();
              break;
          }

          // momentJS doesn't seem to have a way to simply set the minutes/hours/days, so we have
          // to subtract the current value and then add the new value.
          // https://momentjs.com/docs/#/durations/
          schedule[type] = moment
            .duration(duration)
            .subtract(currentValue, unit)
            .add(value, unit)
            .toISOString();

          return schedule;
        },
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
    hasUnsavedFrequencyChanges: [
      () => [selectors.cachedSchedule, selectors.schedule],
      (cachedSchedule, schedule) => !isEqual(cachedSchedule, schedule),
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
      actions.updateServerSettings({
        content_source: {
          indexing: { enabled },
        },
      });
    },
    updateObjectsAndAssetsSettings: () => {
      actions.updateServerSettings({
        content_source: {
          indexing: {
            features: {
              content_extraction: { enabled: values.contentExtractionChecked },
              thumbnails: { enabled: values.thumbnailsChecked },
            },
          },
        },
      });
    },
    updateFrequencySettings: () => {
      actions.updateServerSettings({
        content_source: {
          indexing: {
            schedule: {
              full: values.schedule.full,
              incremental: values.schedule.incremental,
              delete: values.schedule.delete,
            },
          },
        },
      });
    },
    updateServerSettings: async (body: ServerSyncSettingsBody) => {
      const { id: sourceId } = props.contentSource;
      const route = `/internal/workplace_search/org/sources/${sourceId}/settings`;

      try {
        const response = await HttpLogic.values.http.patch(route, {
          body: JSON.stringify(body),
        });

        SourceLogic.actions.setContentSource(response);
        SynchronizationLogic.actions.setServerSchedule(response.indexing.schedule);
        flashSuccessToast(SYNC_SETTINGS_UPDATED_MESSAGE);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});

const SECONDS_IN_MS = 1000;
const getDurationMS = (time: string): number => moment.duration(time).seconds() * SECONDS_IN_MS;
const getISOStringWithoutSeconds = (time: string): string =>
  moment.duration(time).subtract(getDurationMS(time)).toISOString();

// The API allows for setting schedule values with seconds. The UI feature does not allow for setting
// values with seconds. This function strips the seconds from the schedule values for equality checks
// to determine if the user has unsaved changes.
export const stripScheduleSeconds = (schedule: IndexingSchedule): IndexingSchedule => {
  const _schedule = cloneDeep(schedule);
  const { full, incremental, delete: _delete, permissions } = _schedule;
  _schedule.full = getISOStringWithoutSeconds(full);
  _schedule.incremental = getISOStringWithoutSeconds(incremental);
  _schedule.delete = getISOStringWithoutSeconds(_delete);
  if (permissions) _schedule.permissions = getISOStringWithoutSeconds(permissions);

  return _schedule;
};
