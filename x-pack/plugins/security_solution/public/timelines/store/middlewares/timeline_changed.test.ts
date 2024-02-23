/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockStore } from '../../../common/mock';
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

  it('should not mark a timeline as changed for some actions', () => {
    store.dispatch(showTimeline({ id: TimelineId.test, show: true }));
    expect(setChangedMock).not.toHaveBeenCalled();
  });
});
