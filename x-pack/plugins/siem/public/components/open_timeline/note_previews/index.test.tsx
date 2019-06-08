/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash/fp';
import moment from 'moment';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import * as React from 'react';

import { mockTimelineResults } from '../../../mock/timeline_results';
import { OpenTimelineResult, TimelineResultNote } from '../types';
import { NotePreviews } from '.';

describe('NotePreviews', () => {
  let mockResults: OpenTimelineResult[];
  let note1updated: number;
  let note2updated: number;
  let note3updated: number;

  beforeEach(() => {
    mockResults = cloneDeep(mockTimelineResults);
    note1updated = moment('2019-03-24T04:12:33.000Z').valueOf();
    note2updated = moment(note1updated)
      .add(1, 'minute')
      .valueOf();
    note3updated = moment(note2updated)
      .add(1, 'minute')
      .valueOf();
  });

  test('it renders a note preview for each note when isModal is false', () => {
    const hasNotes: OpenTimelineResult[] = [{ ...mockResults[0] }];

    const wrapper = mountWithIntl(<NotePreviews isModal={false} notes={hasNotes[0].notes} />);

    hasNotes[0].notes!.forEach(({ savedObjectId }) => {
      expect(wrapper.find(`[data-test-subj="note-preview-${savedObjectId}"]`).exists()).toBe(true);
    });
  });

  test('it renders a note preview for each note when isModal is true', () => {
    const hasNotes: OpenTimelineResult[] = [{ ...mockResults[0] }];

    const wrapper = mountWithIntl(<NotePreviews isModal={true} notes={hasNotes[0].notes} />);

    hasNotes[0].notes!.forEach(({ savedObjectId }) => {
      expect(wrapper.find(`[data-test-subj="note-preview-${savedObjectId}"]`).exists()).toBe(true);
    });
  });

  test('it does NOT render the preview container if notes is undefined', () => {
    const wrapper = mountWithIntl(<NotePreviews isModal={false} />);

    expect(wrapper.find('[data-test-subj="note-previews-container"]').exists()).toBe(false);
  });

  test('it does NOT render the preview container if notes is null', () => {
    const wrapper = mountWithIntl(<NotePreviews isModal={false} notes={null} />);

    expect(wrapper.find('[data-test-subj="note-previews-container"]').exists()).toBe(false);
  });

  test('it does NOT render the preview container if notes is empty', () => {
    const wrapper = mountWithIntl(<NotePreviews isModal={false} notes={[]} />);

    expect(wrapper.find('[data-test-subj="note-previews-container"]').exists()).toBe(false);
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

    const wrapper = mountWithIntl(<NotePreviews isModal={false} notes={nonUniqueNotes} />);

    expect(
      wrapper
        .find(`[data-test-subj="updated-by"]`)
        .at(2)
        .text()
    ).toEqual('bob');
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

    const wrapper = mountWithIntl(<NotePreviews isModal={false} notes={nonUniqueNotes} />);

    expect(
      wrapper
        .find(`[data-test-subj="updated-by"]`)
        .at(2)
        .text()
    ).toEqual('bob');
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

    const wrapper = mountWithIntl(<NotePreviews isModal={false} notes={nonUniqueNotes} />);

    expect(
      wrapper
        .find(`[data-test-subj="updated-by"]`)
        .at(2)
        .text()
    ).toEqual('bob');
  });
});
