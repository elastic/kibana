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

import { nextTick } from '@kbn/test-jest-helpers';

import {
  InlineEditableTableLogic,
  InlineEditableTableProps,
} from '../../../../../shared/tables/inline_editable_table/inline_editable_table_logic';
import { ItemWithAnID } from '../../../../../shared/tables/types';
import { itShowsServerErrorAsFlashMessage } from '../../../../../test_helpers';

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
  EditableIndexingRule,
} from './synchronization_logic';

describe('SynchronizationLogic', () => {
  const { http } = mockHttpValues;
  const { flashSuccessToast, flashAPIErrors } = mockFlashMessageHelpers;
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

  const defaultIndexingRules: EditableIndexingRule[] = [
    {
      filterType: 'object_type',
      id: 0,
      value: 'value',
      valueType: 'include',
    },
    {
      filterType: 'path_template',
      id: 1,
      value: 'value',
      valueType: 'exclude',
    },
    {
      filterType: 'file_extension',
      id: 2,
      value: 'value',
      valueType: 'include',
    },
  ];

  const defaultValues = {
    navigatingBetweenTabs: false,
    hasUnsavedAssetsAndObjectsChanges: false,
    hasUnsavedIndexingRulesChanges: false,
    hasUnsavedFrequencyChanges: false,
    contentExtractionChecked: true,
    thumbnailsChecked: true,
    indexingRules: defaultIndexingRules,
    indexingRulesForAPI: [
      {
        filter_type: 'object_type',
        include: 'value',
      },
      {
        filter_type: 'path_template',
        exclude: 'value',
      },
      {
        filter_type: 'file_extension',
        include: 'value',
      },
    ],
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
      SynchronizationLogic.actions.addIndexingRule({
        filterType: 'file_extension',
        valueType: 'exclude',
        value: 'value',
      });
      SynchronizationLogic.actions.resetSyncSettings();

      expect(SynchronizationLogic.values.thumbnailsChecked).toEqual(true);
      expect(SynchronizationLogic.values.contentExtractionChecked).toEqual(true);
      expect(SynchronizationLogic.values.indexingRules).toEqual(defaultIndexingRules);
      expect(SynchronizationLogic.values.hasUnsavedIndexingRulesChanges).toEqual(false);
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

    describe('addIndexingRule', () => {
      const indexingRule: EditableIndexingRule = {
        filterType: 'file_extension',
        valueType: 'exclude',
        value: 'value',
        id: 10,
      };

      it('adds indexing rule with id 0', () => {
        SynchronizationLogic.actions.setIndexingRules([]);
        SynchronizationLogic.actions.addIndexingRule(indexingRule);

        expect(SynchronizationLogic.values.indexingRules).toEqual([{ ...indexingRule, id: 0 }]);
        expect(SynchronizationLogic.values.hasUnsavedIndexingRulesChanges).toEqual(true);
      });

      it('adds indexing rule with id existing length + 1', () => {
        SynchronizationLogic.actions.addIndexingRule(indexingRule);

        expect(SynchronizationLogic.values.indexingRules).toEqual([
          ...defaultValues.indexingRules,
          { ...indexingRule, id: 3 },
        ]);
        expect(SynchronizationLogic.values.hasUnsavedIndexingRulesChanges).toEqual(true);
      });
      it('adds indexing rule with unique id in case of previous deletions', () => {
        SynchronizationLogic.actions.deleteIndexingRule({ ...indexingRule, id: 1 });
        SynchronizationLogic.actions.addIndexingRule(indexingRule);

        expect(SynchronizationLogic.values.indexingRules).toEqual([
          defaultValues.indexingRules[0],
          defaultValues.indexingRules[2],
          { ...indexingRule, id: 3 },
        ]);
        expect(SynchronizationLogic.values.hasUnsavedIndexingRulesChanges).toEqual(true);
      });
    });

    describe('setIndexingRule', () => {
      const indexingRule: EditableIndexingRule = {
        filterType: 'file_extension',
        valueType: 'exclude',
        value: 'value',
        id: 1,
      };

      it('updates indexing rule', () => {
        SynchronizationLogic.actions.setIndexingRule(indexingRule);

        expect(SynchronizationLogic.values.indexingRules).toEqual([
          defaultValues.indexingRules[0],
          indexingRule,
          defaultValues.indexingRules[2],
        ]);
        expect(SynchronizationLogic.values.hasUnsavedIndexingRulesChanges).toEqual(true);
      });
    });

    describe('setIndexingRules', () => {
      const indexingRule: EditableIndexingRule = {
        filterType: 'file_extension',
        valueType: 'exclude',
        value: 'value',
        id: 1,
      };

      it('updates indexing rules', () => {
        SynchronizationLogic.actions.setIndexingRules([indexingRule, indexingRule]);

        expect(SynchronizationLogic.values.indexingRules).toEqual([
          { ...indexingRule, id: 0 },
          { ...indexingRule, id: 1 },
        ]);
        expect(SynchronizationLogic.values.hasUnsavedIndexingRulesChanges).toEqual(true);
      });
    });

    describe('deleteIndexingRule', () => {
      const indexingRule: EditableIndexingRule = {
        filterType: 'file_extension',
        valueType: 'exclude',
        value: 'value',
        id: 1,
      };

      it('updates indexing rules', () => {
        const newIndexingRules = defaultValues.indexingRules.filter(
          (val) => val.id !== indexingRule.id
        );
        SynchronizationLogic.actions.deleteIndexingRule(indexingRule);
        expect(SynchronizationLogic.values.indexingRules).toEqual(newIndexingRules);

        expect(SynchronizationLogic.values.hasUnsavedIndexingRulesChanges).toEqual(true);
      });
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

    describe('initAddIndexingRule', () => {
      const indexingRule: EditableIndexingRule = {
        filterType: 'file_extension',
        valueType: 'exclude',
        value: 'value',
        id: 1,
      };
      it('calls validate endpoint and continues if no errors happen', async () => {
        const addIndexingRuleSpy = jest.spyOn(SynchronizationLogic.actions, 'addIndexingRule');
        const promise = Promise.resolve({ rules: [] });
        const doneSpy = jest.spyOn(
          InlineEditableTableLogic({
            instanceId: 'IndexingRulesTable',
          } as InlineEditableTableProps<ItemWithAnID>).actions,
          'doneEditing'
        );
        http.post.mockReturnValue(promise);
        SynchronizationLogic.actions.initAddIndexingRule(indexingRule);

        expect(http.post).toHaveBeenCalledWith(
          '/internal/workplace_search/org/sources/123/indexing_rules/validate',
          {
            body: JSON.stringify({
              rules: [
                {
                  filter_type: 'file_extension',
                  exclude: 'value',
                },
              ],
            }),
          }
        );
        await promise;
        expect(addIndexingRuleSpy).toHaveBeenCalledWith(indexingRule);
        expect(doneSpy).toHaveBeenCalled();
      });

      it('calls validate endpoint and sets errors if there is an error', async () => {
        const addIndexingRuleSpy = jest.spyOn(SynchronizationLogic.actions, 'addIndexingRule');
        const promise = Promise.resolve({ rules: [{ valid: false, error: 'error' }] });
        http.post.mockReturnValue(promise);
        SynchronizationLogic.actions.initAddIndexingRule({ ...indexingRule, valueType: 'include' });
        const doneSpy = jest.spyOn(
          InlineEditableTableLogic({
            instanceId: 'IndexingRulesTable',
          } as InlineEditableTableProps<ItemWithAnID>).actions,
          'doneEditing'
        );

        expect(http.post).toHaveBeenCalledWith(
          '/internal/workplace_search/org/sources/123/indexing_rules/validate',
          {
            body: JSON.stringify({
              rules: [
                {
                  filter_type: 'file_extension',
                  include: 'value',
                },
              ],
            }),
          }
        );
        await promise;
        expect(addIndexingRuleSpy).not.toHaveBeenCalled();
        expect(doneSpy).toHaveBeenCalled();
      });

      it('flashes an error if the API call fails', async () => {
        const addIndexingRuleSpy = jest.spyOn(SynchronizationLogic.actions, 'addIndexingRule');
        const promise = Promise.reject('error');
        http.post.mockReturnValue(promise);
        const doneSpy = jest.spyOn(
          InlineEditableTableLogic({
            instanceId: 'IndexingRulesTable',
          } as InlineEditableTableProps<ItemWithAnID>).actions,
          'doneEditing'
        );
        SynchronizationLogic.actions.initAddIndexingRule(indexingRule);

        expect(http.post).toHaveBeenCalledWith(
          '/internal/workplace_search/org/sources/123/indexing_rules/validate',
          {
            body: JSON.stringify({
              rules: [
                {
                  filter_type: 'file_extension',
                  exclude: 'value',
                },
              ],
            }),
          }
        );
        await nextTick();
        expect(addIndexingRuleSpy).not.toHaveBeenCalled();
        expect(doneSpy).not.toHaveBeenCalled();
        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });

    describe('initSetIndexingRule', () => {
      const indexingRule: EditableIndexingRule = {
        filterType: 'file_extension',
        valueType: 'exclude',
        value: 'value',
        id: 1,
      };

      it('calls validate endpoint and continues if no errors happen', async () => {
        const setIndexingRuleSpy = jest.spyOn(SynchronizationLogic.actions, 'setIndexingRule');
        const promise = Promise.resolve({ rules: [] });
        http.post.mockReturnValue(promise);
        const doneSpy = jest.spyOn(
          InlineEditableTableLogic({
            instanceId: 'IndexingRulesTable',
          } as InlineEditableTableProps<ItemWithAnID>).actions,
          'doneEditing'
        );
        SynchronizationLogic.actions.initSetIndexingRule(indexingRule);

        expect(http.post).toHaveBeenCalledWith(
          '/internal/workplace_search/org/sources/123/indexing_rules/validate',
          {
            body: JSON.stringify({
              rules: [
                {
                  filter_type: 'file_extension',
                  exclude: 'value',
                },
              ],
            }),
          }
        );
        await promise;
        expect(setIndexingRuleSpy).toHaveBeenCalledWith(indexingRule);
        expect(doneSpy).toHaveBeenCalled();
      });

      it('calls validate endpoint and sets errors if there is an error', async () => {
        const setIndexingRuleSpy = jest.spyOn(SynchronizationLogic.actions, 'setIndexingRule');
        const promise = Promise.resolve({ rules: [{ valid: false, error: 'error' }] });
        http.post.mockReturnValue(promise);
        const doneSpy = jest.spyOn(
          InlineEditableTableLogic({
            instanceId: 'IndexingRulesTable',
          } as InlineEditableTableProps<ItemWithAnID>).actions,
          'doneEditing'
        );
        SynchronizationLogic.actions.initSetIndexingRule({ ...indexingRule, valueType: 'include' });

        expect(http.post).toHaveBeenCalledWith(
          '/internal/workplace_search/org/sources/123/indexing_rules/validate',
          {
            body: JSON.stringify({
              rules: [
                {
                  filter_type: 'file_extension',
                  include: 'value',
                },
              ],
            }),
          }
        );
        await promise;
        expect(setIndexingRuleSpy).not.toHaveBeenCalled();
        expect(doneSpy).toHaveBeenCalled();
      });
      it('flashes an error if the API call fails', async () => {
        const setIndexingRuleSpy = jest.spyOn(SynchronizationLogic.actions, 'setIndexingRule');
        const promise = Promise.reject('error');
        http.post.mockReturnValue(promise);
        const doneSpy = jest.spyOn(
          InlineEditableTableLogic({
            instanceId: 'IndexingRulesTable',
          } as InlineEditableTableProps<ItemWithAnID>).actions,
          'doneEditing'
        );
        SynchronizationLogic.actions.initSetIndexingRule(indexingRule);

        expect(http.post).toHaveBeenCalledWith(
          '/internal/workplace_search/org/sources/123/indexing_rules/validate',
          {
            body: JSON.stringify({
              rules: [
                {
                  filter_type: 'file_extension',
                  exclude: 'value',
                },
              ],
            }),
          }
        );
        await nextTick();
        expect(setIndexingRuleSpy).not.toHaveBeenCalled();
        expect(doneSpy).not.toHaveBeenCalled();
        expect(flashAPIErrors).toHaveBeenCalledWith('error');
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

    describe('updateAssetsAndObjectsSettings', () => {
      it('calls updateServerSettings method', async () => {
        const updateServerSettingsSpy = jest.spyOn(
          SynchronizationLogic.actions,
          'updateServerSettings'
        );
        SynchronizationLogic.actions.updateAssetsAndObjectsSettings();

        expect(updateServerSettingsSpy).toHaveBeenCalledWith({
          content_source: {
            indexing: {
              features: {
                content_extraction: { enabled: true },
                thumbnails: { enabled: true },
              },
              rules: [
                {
                  filter_type: 'object_type',
                  include: 'value',
                },
                {
                  filter_type: 'path_template',
                  exclude: 'value',
                },
                {
                  filter_type: 'file_extension',
                  include: 'value',
                },
              ],
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

      itShowsServerErrorAsFlashMessage(http.patch, () => {
        SynchronizationLogic.actions.updateServerSettings(body);
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
