/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
  createSecuritySolutionStorageMock,
  kibanaObservable,
} from '../../../common/mock';

import type { State } from '../../../common/store/types';
import { createStore } from '../../../common/store';
import { selectTimelineById } from '../selectors';
import { TimelineId } from '../../../../common/types/timeline';

import { setChanged, updateKqlMode, showTimeline } from '../actions';

jest.mock('../actions', () => {
  const actual = jest.requireActual('../actions');
  return {
    ...actual,
    setChanged: jest.fn().mockImplementation((...args) => actual.setChanged(...args)),
  };
});

const setChangedMock = setChanged as unknown as jest.Mock;

describe('Timeline changed middleware', () => {
  const state: State = mockGlobalState;
  const { storage } = createSecuritySolutionStorageMock();
  let store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

  beforeEach(() => {
    store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
    setChangedMock.mockClear();
  });

  it('should mark a timeline as changed for some actions', async () => {
    expect(selectTimelineById(store.getState(), TimelineId.test).kqlMode).toEqual('filter');

    store.dispatch(updateKqlMode({ id: TimelineId.test, kqlMode: 'search' }));

    expect(setChangedMock).toHaveBeenCalledWith({ id: TimelineId.test, changed: true });
    expect(selectTimelineById(store.getState(), TimelineId.test).kqlMode).toEqual('search');
  });

  it('should not mark a timeline as changed for some actions', async () => {
    store.dispatch(showTimeline({ id: TimelineId.test, show: true }));
    expect(setChangedMock).not.toHaveBeenCalled();
  });
});
