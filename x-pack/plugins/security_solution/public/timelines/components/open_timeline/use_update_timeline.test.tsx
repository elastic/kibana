/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockTimelineModel } from '../../../common/mock';
import { setTimelineRangeDatePicker as dispatchSetTimelineRangeDatePicker } from '../../../common/store/inputs/actions';
import {
  applyKqlFilterQuery as dispatchApplyKqlFilterQuery,
  addTimeline as dispatchAddTimeline,
  addNote as dispatchAddGlobalTimelineNote,
} from '../../store/actions';
import {
  addNotes as dispatchAddNotes,
  updateNote as dispatchUpdateNote,
} from '../../../common/store/app/actions';
import { useUpdateTimeline } from './use_update_timeline';
import type { DispatchUpdateTimeline } from './types';
import type { Note } from '../../../common/lib/note';
import moment from 'moment';
import sinon from 'sinon';
import type { KueryFilterQueryKind } from '../../../../common/types/timeline';
import { TimelineId } from '../../../../common/types/timeline';

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useDispatch: () => jest.fn(),
  };
});
jest.mock('uuid', () => {
  return {
    v1: jest.fn(() => 'uuidv1()'),
    v4: jest.fn(() => 'uuidv4()'),
  };
});
jest.mock('../../../common/store/inputs/actions');
jest.mock('../../../common/utils/normalize_time_range');
jest.mock('../../store/actions');
jest.mock('../../../common/store/app/actions');

const mockUpdateTimeline = jest.fn();
jest.mock('./helpers', () => {
  const actual = jest.requireActual('./helpers');
  return {
    ...actual,
    useUpdateTimeline: () => mockUpdateTimeline,
  };
});

jest.mock('../../../common/utils/default_date_settings', () => {
  const actual = jest.requireActual('../../../common/utils/default_date_settings');
  return {
    ...actual,
    DEFAULT_FROM_MOMENT: new Date('2020-10-27T11:37:31.655Z'),
    DEFAULT_TO_MOMENT: new Date('2020-10-28T11:37:31.655Z'),
  };
});

jest.mock('../../containers/api');

describe('dispatchUpdateTimeline', () => {
  const anchor = '2020-03-27T20:34:51.337Z';
  const unix = moment(anchor).valueOf();
  let clock: sinon.SinonFakeTimers;
  let timelineDispatch: DispatchUpdateTimeline;

  const defaultArgs = {
    duplicate: true,
    id: TimelineId.active,
    from: '2020-03-26T14:35:56.356Z',
    to: '2020-03-26T14:41:56.356Z',
    notes: [],
    timeline: mockTimelineModel,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    clock = sinon.useFakeTimers(unix);
    timelineDispatch = useUpdateTimeline();
  });

  afterEach(function () {
    clock.restore();
  });

  test('it invokes date range picker dispatch', () => {
    timelineDispatch(defaultArgs);

    expect(dispatchSetTimelineRangeDatePicker).toHaveBeenCalledWith({
      from: '2020-03-26T14:35:56.356Z',
      to: '2020-03-26T14:41:56.356Z',
    });
  });

  test('it invokes add timeline dispatch', () => {
    timelineDispatch(defaultArgs);

    expect(dispatchAddTimeline).toHaveBeenCalledWith({
      id: TimelineId.active,
      savedTimeline: true,
      timeline: {
        ...mockTimelineModel,
        version: null,
        updated: undefined,
        changed: undefined,
      },
    });
  });

  test('it does not invoke kql filter query dispatches if timeline.kqlQuery.filterQuery is null', () => {
    timelineDispatch(defaultArgs);

    expect(dispatchApplyKqlFilterQuery).not.toHaveBeenCalled();
  });

  test('it does not invoke notes dispatch if duplicate is true', () => {
    timelineDispatch(defaultArgs);

    expect(dispatchAddNotes).not.toHaveBeenCalled();
  });

  test('it does not invoke kql filter query dispatches if timeline.kqlQuery.kuery is null', () => {
    const mockTimeline = {
      ...mockTimelineModel,
      kqlQuery: {
        filterQuery: {
          kuery: null,
          serializedQuery: 'some-serialized-query',
        },
      },
    };
    timelineDispatch({
      ...defaultArgs,
      timeline: mockTimeline,
    });

    expect(dispatchApplyKqlFilterQuery).not.toHaveBeenCalled();
  });

  test('it invokes kql filter query dispatches if timeline.kqlQuery.filterQuery.kuery is not null', () => {
    const mockTimeline = {
      ...mockTimelineModel,
      kqlQuery: {
        filterQuery: {
          kuery: { expression: 'expression', kind: 'kuery' as KueryFilterQueryKind },
          serializedQuery: 'some-serialized-query',
        },
      },
    };
    timelineDispatch({
      ...defaultArgs,
      timeline: mockTimeline,
    });

    expect(dispatchApplyKqlFilterQuery).toHaveBeenCalledWith({
      id: TimelineId.active,
      filterQuery: {
        kuery: {
          kind: 'kuery',
          expression: 'expression',
        },
        serializedQuery: 'some-serialized-query',
      },
    });
  });

  test('it invokes dispatchAddNotes if duplicate is false', () => {
    timelineDispatch({
      ...defaultArgs,
      duplicate: false,
      notes: [
        {
          created: 1585233356356,
          updated: 1585233356356,
          noteId: 'note-id',
          note: 'I am a note',
          timelineId: 'abc',
          version: 'testVersion',
        },
      ],
    });

    expect(dispatchAddGlobalTimelineNote).not.toHaveBeenCalled();
    expect(dispatchUpdateNote).not.toHaveBeenCalled();
    expect(dispatchAddNotes).toHaveBeenCalledWith({
      notes: [
        {
          created: new Date('2020-03-26T14:35:56.356Z'),
          eventId: null,
          id: 'note-id',
          lastEdit: new Date('2020-03-26T14:35:56.356Z'),
          note: 'I am a note',
          user: 'unknown',
          saveObjectId: 'note-id',
          timelineId: 'abc',
          version: 'testVersion',
        },
      ],
    });
  });

  test('it invokes dispatch to create a timeline note if duplicate is true and ruleNote exists', () => {
    timelineDispatch({
      ...defaultArgs,
      ruleNote: '# this would be some markdown',
    });
    const expectedNote: Note = {
      created: new Date(anchor),
      id: 'uuidv4()',
      lastEdit: null,
      note: '# this would be some markdown',
      saveObjectId: null,
      user: 'elastic',
      version: null,
    };

    expect(dispatchAddNotes).not.toHaveBeenCalled();
    expect(dispatchUpdateNote).toHaveBeenCalledWith({ note: expectedNote });
    expect(dispatchAddGlobalTimelineNote).toHaveBeenLastCalledWith({
      id: TimelineId.active,
      noteId: 'uuidv4()',
    });
  });
});
