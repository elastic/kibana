/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, omit } from 'lodash/fp';
import type { Action } from 'redux';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { TimelineModel } from '../../../timelines/store/timeline/model';
import type { TimelineById } from '../../../timelines/store/timeline/types';
import {
  applyKqlFilterQuery,
  addProvider,
  addTimeline,
  dataProviderEdited,
  removeProvider,
  saveTimeline,
  setExcludedRowRendererIds,
  setFilters,
  setSavedQueryId,
  updateDataProviderEnabled,
  updateDataProviderExcluded,
  updateDataProviderType,
  updateEqlOptions,
  updateKqlMode,
  updateProviders,
  updateTitleAndDescription,
  updateDataView,
  removeColumn as timelineRemoveColumn,
  updateColumns as timelineUpdateColumns,
  updateSort as timelineUpdateSort,
  updateRange as timelineUpdateRange,
  upsertColumn as timelineUpsertColumn,
  updateSavedSearchId,
} from '../../../timelines/store/timeline/actions';

export const timelineActionTypes = [
  applyKqlFilterQuery.type,
  addProvider.type,
  addTimeline.type,
  dataProviderEdited.type,
  removeProvider.type,
  saveTimeline.type,
  setExcludedRowRendererIds.type,
  setFilters.type,
  setSavedQueryId.type,
  updateDataProviderEnabled.type,
  updateDataProviderExcluded.type,
  updateDataProviderType.type,
  updateEqlOptions.type,
  updateKqlMode.type,
  updateProviders.type,
  updateTitleAndDescription.type,
  updateDataView.type,
  timelineRemoveColumn.type,
  timelineUpdateColumns.type,
  timelineUpdateSort.type,
  timelineUpdateRange.type,
  timelineUpsertColumn.type,

  updateSavedSearchId.type,
];

export const LOCAL_STORAGE_TIMELINE_KEY = 'securitySolution.timeline';

interface AddTimelineToStorageArgs {
  storage: Storage;
  timelineById: TimelineById;
  action: Action;
}

const timelineModelKeysToExcludeFromStorage: Array<keyof TimelineModel> = ['filterManager'];

export const addTimelineToStorage = ({
  storage,
  timelineById,
  action,
}: AddTimelineToStorageArgs) => {
  if (!storage) return;
  if (!timelineActionTypes.includes(action.type)) return;

  const timelineId: string = get('payload.id', action);

  const timelineDataToStore = omit(timelineModelKeysToExcludeFromStorage, timelineById[timelineId]);

  storage.set(LOCAL_STORAGE_TIMELINE_KEY, {
    [timelineId]: timelineDataToStore,
  });
};

export const restoreTimelineFromStorage = (storage: Storage): TimelineById => {
  const storedTimelineState = storage.get(LOCAL_STORAGE_TIMELINE_KEY);

  return storedTimelineState;
};
