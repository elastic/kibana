/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash/fp';
import moment from 'moment';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import '../../../../common/mock/formatted_relative';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { mockTimelineResults } from '../../../../common/mock/timeline_results';
import { OpenTimelineResult, TimelineResultNote } from '../types';
import { NotePreviews } from '.';

jest.mock('../../../../common/hooks/use_selector');

jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => jest.fn(),
  };
});

describe('NotePreviews', () => {
  let mockResults: OpenTimelineResult[];
  let note1updated: number;
  let note2updated: number;
  let note3updated: number;

  beforeEach(() => {
    mockResults = cloneDeep(mockTimelineResults);
    note1updated = moment('2019-03-24T04:12:33.000Z').valueOf();
    note2updated = moment(note1updated).add(1, 'minute').valueOf();
    note3updated = moment(note2updated).add(1, 'minute').valueOf();
    (useDeepEqualSelector as jest.Mock).mockReset();
  });

  test('it renders a note preview for each note when isModal is false', () => {
    const hasNotes: OpenTimelineResult[] = [{ ...mockResults[0] }];

    const wrapper = mountWithIntl(<NotePreviews notes={hasNotes[0].notes} />);

    hasNotes[0].notes?.forEach(({ savedObjectId }) => {
      expect(wrapper.find(`[data-test-subj="note-preview-${savedObjectId}"]`).exists()).toBe(true);
    });
  });

  test('it renders a note preview for each note when isModal is true', () => {
    const hasNotes: OpenTimelineResult[] = [{ ...mockResults[0] }];

    const wrapper = mountWithIntl(<NotePreviews notes={hasNotes[0].notes} />);

    hasNotes[0].notes?.forEach(({ savedObjectId }) => {
      expect(wrapper.find(`[data-test-subj="note-preview-${savedObjectId}"]`).exists()).toBe(true);
    });
  });

  test('it filters-out non-unique savedObjectIds', () => {
    const nonUniqueNotes: TimelineResultNote[] = [
      {
        note: '1',
        savedObjectId: 'noteId1',
        updated: note1updated,
        updatedBy: 'alice',
      },
      {
        note: '2 (savedObjectId is the same as the previous entry)',
        savedObjectId: 'noteId1',
        updated: note2updated,
        updatedBy: 'alice',
      },
      {
        note: '3',
        savedObjectId: 'noteId2',
        updated: note3updated,
        updatedBy: 'bob',
      },
    ];

    const wrapper = mountWithIntl(<NotePreviews notes={nonUniqueNotes} />);

    expect(wrapper.find('.euiCommentEvent__headerUsername').at(1).text()).toEqual('bob');
  });

  test('it filters-out null savedObjectIds', () => {
    const nonUniqueNotes: TimelineResultNote[] = [
      {
        note: '1',
        savedObjectId: 'noteId1',
        updated: note1updated,
        updatedBy: 'alice',
      },
      {
        note: '2 (savedObjectId is null)',
        savedObjectId: null,
        updated: note2updated,
        updatedBy: 'alice',
      },
      {
        note: '3',
        savedObjectId: 'noteId2',
        updated: note3updated,
        updatedBy: 'bob',
      },
    ];

    const wrapper = mountWithIntl(<NotePreviews notes={nonUniqueNotes} />);

    expect(wrapper.find(`.euiCommentEvent__headerUsername`).at(2).text()).toEqual('bob');
  });

  test('it filters-out undefined savedObjectIds', () => {
    const nonUniqueNotes: TimelineResultNote[] = [
      {
        note: '1',
        savedObjectId: 'noteId1',
        updated: note1updated,
        updatedBy: 'alice',
      },
      {
        note: 'b (savedObjectId is undefined)',
        updated: note2updated,
        updatedBy: 'alice',
      },
      {
        note: 'c',
        savedObjectId: 'noteId2',
        updated: note3updated,
        updatedBy: 'bob',
      },
    ];

    const wrapper = mountWithIntl(<NotePreviews notes={nonUniqueNotes} />);

    expect(wrapper.find(`.euiCommentEvent__headerUsername`).at(2).text()).toEqual('bob');
  });

  test('it renders timeline description as a note when showTimelineDescription is true and timelineId is defined', () => {
    const timeline = mockTimelineResults[0];
    (useDeepEqualSelector as jest.Mock).mockReturnValue(timeline);

    const wrapper = mountWithIntl(
      <NotePreviews notes={[]} showTimelineDescription timelineId="test-timeline-id" />
    );

    expect(wrapper.find('[data-test-subj="note-preview-description"]').first().text()).toContain(
      timeline.description
    );
  });

  test('it does`t render timeline description as a note when it is undefined', () => {
    const timeline = mockTimelineResults[0];
    (useDeepEqualSelector as jest.Mock).mockReturnValue({ ...timeline, description: undefined });

    const wrapper = mountWithIntl(<NotePreviews notes={[]} />);

    expect(wrapper.find('[data-test-subj="note-preview-description"]').exists()).toBe(false);
  });
});
