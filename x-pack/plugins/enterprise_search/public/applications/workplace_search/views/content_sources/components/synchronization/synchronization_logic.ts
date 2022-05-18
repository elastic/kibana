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
import {
  InlineEditableTableLogic,
  InlineEditableTableProps,
} from '../../../../../shared/tables/inline_editable_table/inline_editable_table_logic';
import { ItemWithAnID } from '../../../../../shared/tables/types';
import { AppLogic } from '../../../../app_logic';
import {
  SYNC_FREQUENCY_PATH,
  BLOCKED_TIME_WINDOWS_PATH,
  getContentSourcePath,
} from '../../../../routes';

import {
  BlockedWindow,
  DayOfWeek,
  IndexingSchedule,
  IndexingRule,
  ContentSourceFullData,
  SyncJobType,
  TimeUnit,
  IndexingRuleInclude,
} from '../../../../types';

import { SYNC_SETTINGS_UPDATED_MESSAGE } from '../../constants';
import { SourceLogic } from '../../source_logic';

type BlockedWindowPropType = 'jobType' | 'day' | 'start' | 'end';

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
      rules?: IndexingRule[];
    };
  };
}

interface SynchronizationActions {
  setNavigatingBetweenTabs(navigatingBetweenTabs: boolean): boolean;
  handleSelectedTabChanged(tabId: TabId): TabId;
  addBlockedWindow(): void;
  removeBlockedWindow(index: number): number;
  updateFrequencySettings(): void;
  updateAssetsAndObjectsSettings(): void;
  resetSyncSettings(): void;
  updateSyncEnabled(enabled: boolean): boolean;
  setThumbnailsChecked(checked: boolean): boolean;
  setSyncFrequency(
    type: SyncJobType,
    value: string,
    unit: TimeUnit
  ): { type: SyncJobType; value: number; unit: TimeUnit };
  setBlockedTimeWindow(
    index: number,
    prop: BlockedWindowPropType,
    value: string
  ): {
    index: number;
    prop: BlockedWindowPropType;
    value: string;
  };
  setContentExtractionChecked(checked: boolean): boolean;
  setServerSchedule(schedule: IndexingSchedule): IndexingSchedule;
  updateServerSettings(body: ServerSyncSettingsBody): ServerSyncSettingsBody;
  addIndexingRule(indexingRule: EditableIndexingRuleBase): EditableIndexingRuleBase;
  initAddIndexingRule(rule: EditableIndexingRule): { rule: EditableIndexingRule };
  setIndexingRules(indexingRules: EditableIndexingRule[]): EditableIndexingRule[];
  setIndexingRule(indexingRule: EditableIndexingRule): EditableIndexingRule;
  initSetIndexingRule(indexingRule: EditableIndexingRule): { rule: EditableIndexingRule };
  deleteIndexingRule(indexingRule: EditableIndexingRule): EditableIndexingRule;
}

interface SynchronizationValues {
  navigatingBetweenTabs: boolean;
  hasUnsavedIndexingRulesChanges: boolean;
  hasUnsavedFrequencyChanges: boolean;
  hasUnsavedAssetsAndObjectsChanges: boolean;
  indexingRules: EditableIndexingRule[];
  thumbnailsChecked: boolean;
  contentExtractionChecked: boolean;
  cachedSchedule: IndexingSchedule;
  schedule: IndexingSchedule;
  indexingRulesForAPI: IndexingRule[];
  errors: string[];
}

export const emptyBlockedWindow: BlockedWindow = {
  jobType: 'full',
  day: 'monday',
  start: '11:00:00Z',
  end: '13:00:00Z',
};

type BlockedWindowMap = {
  [prop in keyof BlockedWindow]: SyncJobType | DayOfWeek | 'all' | string;
};

interface EditableIndexingRuleBase {
  filterType: 'object_type' | 'path_template' | 'file_extension';
  valueType: 'include' | 'exclude';
  value: string;
}

export interface EditableIndexingRule extends EditableIndexingRuleBase {
  id: number;
}

interface IndexingRuleForAPI {
  filter_type: 'object_type' | 'path_template' | 'file_extension';
  include?: string;
  exclude?: string;
}

const isIncludeRule = (rule: IndexingRule): rule is IndexingRuleInclude => {
  return !!(rule as IndexingRuleInclude).include;
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
    setBlockedTimeWindow: (index: number, prop: BlockedWindowPropType, value: string) => ({
      index,
      prop,
      value,
    }),
    setContentExtractionChecked: (checked: boolean) => checked,
    updateServerSettings: (body: ServerSyncSettingsBody) => body,
    setServerSchedule: (schedule: IndexingSchedule) => schedule,
    removeBlockedWindow: (index: number) => index,
    updateFrequencySettings: true,
    updateAssetsAndObjectsSettings: true,
    resetSyncSettings: true,
    addBlockedWindow: true,
    addIndexingRule: (rule: EditableIndexingRuleBase) => rule,
    deleteIndexingRule: (rule: EditableIndexingRule) => rule,
    initAddIndexingRule: (rule: EditableIndexingRule) => ({ rule }),
    initSetIndexingRule: (rule: EditableIndexingRule) => ({ rule }),
    setIndexingRules: (indexingRules: EditableIndexingRule[]) => indexingRules,
    setIndexingRule: (rule: EditableIndexingRule) => rule,
  },
  reducers: ({ props }) => ({
    hasUnsavedIndexingRulesChanges: [
      false,
      {
        setIndexingRule: () => true,
        setIndexingRules: () => true,
        addIndexingRule: () => true,
        deleteIndexingRule: () => true,
        resetSyncSettings: () => false,
        updateServerSettings: () => false,
      },
    ],
    navigatingBetweenTabs: [
      false,
      {
        setNavigatingBetweenTabs: (_, navigatingBetweenTabs) => navigatingBetweenTabs,
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
        addBlockedWindow: (state) => {
          const schedule = cloneDeep(state);
          const blockedWindows = schedule.blockedWindows || [];
          blockedWindows.push(emptyBlockedWindow);
          schedule.blockedWindows = blockedWindows;
          return schedule;
        },
        removeBlockedWindow: (state, index) => {
          const schedule = cloneDeep(state);
          const blockedWindows = schedule.blockedWindows;
          blockedWindows!.splice(index, 1);
          if (blockedWindows!.length > 0) {
            schedule.blockedWindows = blockedWindows;
          } else {
            delete schedule.blockedWindows;
          }
          return schedule;
        },
        setBlockedTimeWindow: (state, { index, prop, value }) => {
          const schedule = cloneDeep(state);
          const blockedWindows = schedule.blockedWindows;
          const blockedWindow = blockedWindows![index] as BlockedWindowMap;
          blockedWindow[prop] = value;
          (blockedWindows![index] as BlockedWindowMap) = blockedWindow;
          schedule.blockedWindows = blockedWindows;
          return schedule;
        },
      },
    ],
    indexingRules: [
      (props.contentSource.indexing.rules as IndexingRule[]).map((rule, index) => ({
        filterType: rule.filterType,
        id: index,
        valueType: isIncludeRule(rule) ? 'include' : 'exclude',
        value: isIncludeRule(rule) ? rule.include : rule.exclude,
      })),
      {
        addIndexingRule: (indexingRules, rule) => [
          ...indexingRules,
          {
            ...rule,
            // make sure that we get a unique number, in case of multiple deletions and additions
            id: indexingRules.reduce(
              (prev, curr) => (curr.id >= prev ? curr.id + 1 : prev),
              indexingRules.length
            ),
          },
        ],
        deleteIndexingRule: (indexingRules, rule) =>
          indexingRules.filter((currentRule) => currentRule.id !== rule.id),
        resetSyncSettings: () =>
          (props.contentSource.indexing.rules as IndexingRule[]).map((rule, index) => ({
            filterType: rule.filterType,
            id: index,
            valueType: isIncludeRule(rule) ? 'include' : 'exclude',
            value: isIncludeRule(rule) ? rule.include : rule.exclude,
          })),
        setIndexingRules: (_, indexingRules) =>
          indexingRules.map((val, index) => ({ ...val, id: index })),
        setIndexingRule: (state, rule) =>
          state.map((currentRule) => (currentRule.id === rule.id ? rule : currentRule)),
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    hasUnsavedAssetsAndObjectsChanges: [
      () => [
        selectors.thumbnailsChecked,
        selectors.contentExtractionChecked,
        selectors.hasUnsavedIndexingRulesChanges,
        (_, props) => props.contentSource,
      ],
      (
        thumbnailsChecked,
        contentExtractionChecked,
        hasUnsavedIndexingRulesChanges,
        contentSource
      ) => {
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
          contentExtractionChecked !== contentExtractionEnabled ||
          hasUnsavedIndexingRulesChanges
        );
      },
    ],
    hasUnsavedFrequencyChanges: [
      () => [selectors.cachedSchedule, selectors.schedule],
      (cachedSchedule, schedule) => !isEqual(cachedSchedule, schedule),
    ],
    indexingRulesForAPI: [
      () => [selectors.indexingRules],
      (indexingRules: EditableIndexingRule[]) =>
        indexingRules.map((indexingRule) => indexingRuleToApiFormat(indexingRule)),
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
    initAddIndexingRule: async ({ rule }) => {
      const { id: sourceId } = props.contentSource;
      const route = `/internal/workplace_search/org/sources/${sourceId}/indexing_rules/validate`;
      try {
        const response = await HttpLogic.values.http.post<{
          rules: Array<{
            valid: boolean;
            error?: string;
          }>;
        }>(route, {
          body: JSON.stringify({
            rules: [indexingRuleToApiFormat(rule)],
          }),
        });
        const error = response.rules[0]?.error;
        const tableLogic = InlineEditableTableLogic({
          instanceId: 'IndexingRulesTable',
        } as InlineEditableTableProps<ItemWithAnID>);
        if (error) {
          tableLogic.actions.setRowErrors([error]);
        } else {
          actions.addIndexingRule(rule);
        }
        tableLogic.actions.doneEditing();
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    initSetIndexingRule: async ({ rule }) => {
      const { id: sourceId } = props.contentSource;
      const route = `/internal/workplace_search/org/sources/${sourceId}/indexing_rules/validate`;
      try {
        const response = await HttpLogic.values.http.post<{
          rules: Array<{
            valid: boolean;
            error?: string;
          }>;
        }>(route, {
          body: JSON.stringify({
            rules: [indexingRuleToApiFormat(rule)],
          }),
        });
        const error = response.rules[0]?.error;
        const tableLogic = InlineEditableTableLogic({
          instanceId: 'IndexingRulesTable',
        } as InlineEditableTableProps<ItemWithAnID>);
        if (error) {
          tableLogic.actions.setRowErrors([error]);
        } else {
          actions.setIndexingRule(rule);
        }
        tableLogic.actions.doneEditing();
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    updateSyncEnabled: async (enabled) => {
      actions.updateServerSettings({
        content_source: {
          indexing: { enabled },
        },
      });
    },
    updateAssetsAndObjectsSettings: () => {
      actions.updateServerSettings({
        content_source: {
          indexing: {
            features: {
              content_extraction: { enabled: values.contentExtractionChecked },
              thumbnails: { enabled: values.thumbnailsChecked },
            },
            rules: values.indexingRulesForAPI,
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
              blocked_windows: formatBlockedWindowsForServer(values.schedule.blockedWindows),
            },
          },
        },
      });
    },
    updateServerSettings: async (body: ServerSyncSettingsBody) => {
      const { id: sourceId } = props.contentSource;
      const route = `/internal/workplace_search/org/sources/${sourceId}/settings`;

      try {
        const response = await HttpLogic.values.http.patch<ContentSourceFullData>(route, {
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

const formatBlockedWindowsForServer = (
  blockedWindows?: BlockedWindow[]
): ServerBlockedWindow[] | undefined => {
  if (!blockedWindows || blockedWindows.length < 1) return [];

  return blockedWindows.map(({ jobType, day, start, end }) => ({
    job_type: jobType,
    day,
    start,
    end,
  }));
};

const indexingRuleToApiFormat = (indexingRule: EditableIndexingRule): IndexingRuleForAPI => {
  const { valueType, filterType, value } = indexingRule;
  return valueType === 'include'
    ? { filter_type: filterType, include: value }
    : { filter_type: filterType, exclude: value };
};
