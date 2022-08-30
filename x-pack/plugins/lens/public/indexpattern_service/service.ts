/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsContract, DataView } from '@kbn/data-views-plugin/public';
import type { CoreStart, IUiSettingsClient } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { ActionExecutionContext, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import {
  UPDATE_FILTER_REFERENCES_ACTION,
  UPDATE_FILTER_REFERENCES_TRIGGER,
} from '@kbn/unified-search-plugin/public';
import type { DateRange } from '../../common';
import type { IndexPattern, IndexPatternMap, IndexPatternRef } from '../types';
import {
  ensureIndexPattern,
  loadIndexPatternRefs,
  loadIndexPatterns,
  syncExistingFields,
} from './loader';
import type { DataViewsState } from '../state_management';
import { generateId } from '../id_generator';

export interface IndexPatternServiceProps {
  core: Pick<CoreStart, 'http' | 'notifications'>;
  dataViews: DataViewsContract;
  uiSettings: IUiSettingsClient;
  uiActions: UiActionsStart;
  updateIndexPatterns: (
    newState: Partial<DataViewsState>,
    options?: { applyImmediately: boolean }
  ) => void;
  replaceIndexPattern: (
    newIndexPattern: IndexPattern,
    oldId: string,
    options?: { applyImmediately: boolean }
  ) => void;
}

/**
 * This service is only available for the full editor version
 * and it encapsulate all the indexpattern methods and state
 * in a single object.
 * NOTE: this is not intended to be used with the Embeddable branch
 */
export interface IndexPatternServiceAPI {
  /**
   * Loads a list of indexPatterns from a list of id (patterns)
   * leveraging existing cache. Eventually fallbacks to unused indexPatterns ( notUsedPatterns )
   * @returns IndexPatternMap
   */
  loadIndexPatterns: (args: {
    patterns: string[];
    notUsedPatterns?: string[];
    cache: IndexPatternMap;
    onIndexPatternRefresh?: () => void;
  }) => Promise<IndexPatternMap>;
  /**
   * Load indexPatternRefs with title and ids
   */
  loadIndexPatternRefs: (options: { isFullEditor: boolean }) => Promise<IndexPatternRef[]>;
  /**
   * Ensure an indexPattern is loaded in the cache, usually used in conjuction with a indexPattern change action.
   */
  ensureIndexPattern: (args: {
    id: string;
    cache: IndexPatternMap;
  }) => Promise<IndexPatternMap | undefined>;
  /**
   * Loads the existingFields map given the current context
   */
  refreshExistingFields: (args: {
    dateRange: DateRange;
    currentIndexPatternTitle: string;
    dslQuery: object;
    onNoData?: () => void;
    existingFields: Record<string, Record<string, boolean>>;
    indexPatternList: IndexPattern[];
    isFirstExistenceFetch: boolean;
  }) => Promise<void>;

  replaceDataViewId: (newDataView: DataView) => Promise<void>;
  /**
   * Retrieves the default indexPattern from the uiSettings
   */
  getDefaultIndex: () => string;

  /**
   * Update the Lens dataViews state
   */
  updateDataViewsState: (
    newState: Partial<DataViewsState>,
    options?: { applyImmediately: boolean }
  ) => void;
}

export function createIndexPatternService({
  core,
  dataViews,
  uiSettings,
  updateIndexPatterns,
  replaceIndexPattern,
  uiActions,
}: IndexPatternServiceProps): IndexPatternServiceAPI {
  const onChangeError = (err: Error) =>
    core.notifications.toasts.addError(err, {
      title: i18n.translate('xpack.lens.indexPattern.dataViewLoadError', {
        defaultMessage: 'Error loading data view',
      }),
    });
  return {
    updateDataViewsState: updateIndexPatterns,
    loadIndexPatterns: (args) => {
      return loadIndexPatterns({
        dataViews,
        ...args,
      });
    },
    replaceDataViewId: async (dataView: DataView) => {
      const newDataView = await dataViews.create({ ...dataView.toSpec(), id: generateId() });
      dataViews.clearInstanceCache(dataView.id);
      const loadedPatterns = await loadIndexPatterns({
        dataViews,
        patterns: [newDataView.id!],
        cache: {},
      });
      replaceIndexPattern(loadedPatterns[newDataView.id!], dataView.id!, {
        applyImmediately: true,
      });
      const trigger = uiActions.getTrigger(UPDATE_FILTER_REFERENCES_TRIGGER);
      const action = uiActions.getAction(UPDATE_FILTER_REFERENCES_ACTION);

      action?.execute({
        trigger,
        fromDataView: dataView.id,
        toDataView: newDataView.id,
        usedDataViews: [],
      } as ActionExecutionContext);
    },
    ensureIndexPattern: (args) =>
      ensureIndexPattern({ onError: onChangeError, dataViews, ...args }),
    refreshExistingFields: (args) =>
      syncExistingFields({
        updateIndexPatterns,
        fetchJson: core.http.post,
        ...args,
      }),
    loadIndexPatternRefs: async ({ isFullEditor }) =>
      isFullEditor ? loadIndexPatternRefs(dataViews) : [],
    getDefaultIndex: () => uiSettings.get('defaultIndex'),
  };
}
