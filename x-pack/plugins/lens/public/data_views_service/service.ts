/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { CoreStart, IUiSettingsClient } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { DateRange } from '../../common';
import type { IndexPattern, IndexPatternMap, IndexPatternRef } from '../types';
import {
  loadIndexPattern,
  loadIndexPatternRefs,
  loadIndexPatterns,
  syncExistingFields,
} from './loader';
import type { DataViewsState } from '../state_management';

interface IndexPatternServiceProps {
  core: Pick<CoreStart, 'http' | 'notifications'>;
  dataViews: DataViewsContract;
  uiSettings: IUiSettingsClient;
  updateIndexPatterns: (
    newState: Partial<DataViewsState>,
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
  /**
   * Retrieves the default indexPattern from the uiSettings
   */
  getDefaultIndex: () => string;

  /**
   * Update the Lens state cache of indexPatterns
   */
  updateIndexPatternsCache: (
    newState: Partial<DataViewsState>,
    options?: { applyImmediately: boolean }
  ) => void;
}

export function createIndexPatternService({
  core,
  dataViews,
  uiSettings,
  updateIndexPatterns,
}: IndexPatternServiceProps): IndexPatternServiceAPI {
  const onChangeError = (err: Error) =>
    core.notifications.toasts.addError(err, {
      title: i18n.translate('xpack.lens.indexPattern.dataViewLoadError', {
        defaultMessage: 'Error loading data view',
      }),
    });
  return {
    updateIndexPatternsCache: updateIndexPatterns,
    loadIndexPatterns: (args) => {
      return loadIndexPatterns({
        dataViews,
        ...args,
      });
    },
    ensureIndexPattern: (args) => loadIndexPattern({ onError: onChangeError, dataViews, ...args }),
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
