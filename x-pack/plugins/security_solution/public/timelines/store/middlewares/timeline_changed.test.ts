/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockStore } from '../../../common/mock';
import { selectTimelineById } from '../selectors';
import { TimelineId } from '../../../../common/types/timeline';

import {
  setChanged,
  updateKqlMode,
  showTimeline,
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
  updateProviders,
  updateRange,
  updateSort,
  upsertColumn,
  updateDataView,
  updateTitleAndDescription,
  setExcludedRowRendererIds,
  setFilters,
  setSavedQueryId,
  updateSavedSearch,
} from '../actions';
import { timelineChangedTypes } from './timeline_changed';

jest.mock('../actions', () => {
  const actual = jest.requireActual('../actions');
  return {
    ...actual,
    setChanged: jest.fn().mockImplementation((...args) => actual.setChanged(...args)),
  };
});

/**
 * This is a copy of the timeline changed types from the actual middleware.
 * The purpose of this copy is to enforce changes to the original to fail.
 * These changes will need to be applied to the copy to pass the tests.
 * That way, we are preventing accidental changes to the original.
 */
const timelineChangedTypesCopy = [
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
];

const setChangedMock = setChanged as unknown as jest.Mock;

describe('Timeline changed middleware', () => {
  let store = createMockStore();

  beforeEach(() => {
    store = createMockStore();
    setChangedMock.mockClear();
  });

  it('should mark a timeline as changed for some actions', () => {
    expect(selectTimelineById(store.getState(), TimelineId.test).kqlMode).toEqual('filter');

    store.dispatch(updateKqlMode({ id: TimelineId.test, kqlMode: 'search' }));

    expect(setChangedMock).toHaveBeenCalledWith({ id: TimelineId.test, changed: true });
    expect(selectTimelineById(store.getState(), TimelineId.test).kqlMode).toEqual('search');
  });

  it('should check that all correct actions are used to check for changes', () => {
    timelineChangedTypesCopy.forEach((changedType) => {
      expect(timelineChangedTypes.has(changedType)).toBeTruthy();
    });
  });

  it('should not mark a timeline as changed for some actions', () => {
    store.dispatch(showTimeline({ id: TimelineId.test, show: true }));
    expect(setChangedMock).not.toHaveBeenCalled();
  });
});
