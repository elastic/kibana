/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Action } from 'redux';
import type { Epic } from 'redux-observable';
import { get } from 'lodash/fp';
import { filter, map } from 'rxjs/operators';

import {
  applyKqlFilterQuery,
  addProvider,
  dataProviderEdited,
  removeColumn,
  removeProvider,
  updateColumns,
  updateEqlOptions,
  updateDataProviderEnabled,
  updateDataProviderExcluded,
  updateDataProviderType,
  updateKqlMode,
  updateProviders,
  updateRange,
  updateSort,
  upsertColumn,
  updateDataView,
  updateTitleAndDescription,
  setExcludedRowRendererIds,
  setFilters,
  setSavedQueryId,
  setChanged,
  updateSavedSearch,
} from './actions';

/**
 * All action types that will mark a timeline as changed
 */
const timelineChangedTypes = new Set([
  applyKqlFilterQuery.type,
  addProvider.type,
  dataProviderEdited.type,
  removeProvider.type,
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
  removeColumn.type,
  updateColumns.type,
  updateSort.type,
  updateRange.type,
  upsertColumn.type,

  updateSavedSearch.type,
]);

/**
 * Maps actions that mark a timeline change to `setChanged` actions.
 * This allows to detect unsaved timeline changes when navigating away from the timeline.
 */
export const createTimelineChangedEpic = (): Epic<Action, Action> => (action$) => {
  return action$.pipe(
    // Only apply mapping to some actions
    filter((action) => timelineChangedTypes.has(action.type)),
    // Map the action to a `changed` action
    map((action) =>
      setChanged({
        id: get('payload.id', action) as string,
        changed: true,
      })
    )
  );
};
