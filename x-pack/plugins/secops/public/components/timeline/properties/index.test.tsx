/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import {
  Properties,
  showDescriptionThreshold,
  showHistoryThreshold,
  showStreamLiveThreshold,
} from '.';

describe('Properties', () => {
  const usersViewing = ['elastic'];

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <Properties
        associateNote={jest.fn()}
        createTimeline={jest.fn()}
        isFavorite={false}
        isLive={false}
        title=""
        description=""
        getNotesByIds={jest.fn()}
        noteIds={[]}
        history={[]}
        timelineId="abc"
        updateDescription={jest.fn()}
        updateIsFavorite={jest.fn()}
        updateIsLive={jest.fn()}
        updateTitle={jest.fn()}
        updateNote={jest.fn()}
        usersViewing={usersViewing}
        width={1000}
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('it renders an empty star icon when it is NOT a favorite', () => {
    const wrapper = mount(
      <Properties
        associateNote={jest.fn()}
        createTimeline={jest.fn()}
        isFavorite={false}
        isLive={false}
        title=""
        description=""
        getNotesByIds={jest.fn()}
        noteIds={[]}
        history={[]}
        timelineId="abc"
        updateDescription={jest.fn()}
        updateIsFavorite={jest.fn()}
        updateIsLive={jest.fn()}
        updateTitle={jest.fn()}
        updateNote={jest.fn()}
        usersViewing={usersViewing}
        width={1000}
      />
    );

    expect(wrapper.find('[data-test-subj="timeline-favorite-empty-star"]').exists()).toEqual(true);
  });

  test('it renders a filled star icon when it is a favorite', () => {
    const wrapper = mount(
      <Properties
        associateNote={jest.fn()}
        createTimeline={jest.fn()}
        isFavorite={true}
        isLive={false}
        title=""
        description=""
        getNotesByIds={jest.fn()}
        noteIds={[]}
        history={[]}
        timelineId="abc"
        updateDescription={jest.fn()}
        updateIsFavorite={jest.fn()}
        updateIsLive={jest.fn()}
        updateTitle={jest.fn()}
        updateNote={jest.fn()}
        usersViewing={usersViewing}
        width={1000}
      />
    );

    expect(wrapper.find('[data-test-subj="timeline-favorite-filled-star"]').exists()).toEqual(true);
  });

  test('it renders the title of the timeline', () => {
    const title = 'foozle';

    const wrapper = mount(
      <Properties
        associateNote={jest.fn()}
        createTimeline={jest.fn()}
        isFavorite={false}
        isLive={false}
        title={title}
        description=""
        getNotesByIds={jest.fn()}
        noteIds={[]}
        history={[]}
        timelineId="abc"
        updateDescription={jest.fn()}
        updateIsFavorite={jest.fn()}
        updateIsLive={jest.fn()}
        updateTitle={jest.fn()}
        updateNote={jest.fn()}
        usersViewing={usersViewing}
        width={1000}
      />
    );

    expect(
      wrapper
        .find('[data-test-subj="timeline-title"]')
        .first()
        .props().value
    ).toEqual(title);
  });

  test('it renders a description on the left when the width is at least as wide as the threshold', () => {
    const description = 'strange';
    const width = showDescriptionThreshold;

    const wrapper = mount(
      <Properties
        associateNote={jest.fn()}
        createTimeline={jest.fn()}
        isFavorite={false}
        isLive={false}
        title=""
        description={description}
        getNotesByIds={jest.fn()}
        noteIds={[]}
        history={[]}
        timelineId="abc"
        updateDescription={jest.fn()}
        updateIsFavorite={jest.fn()}
        updateIsLive={jest.fn()}
        updateTitle={jest.fn()}
        updateNote={jest.fn()}
        usersViewing={usersViewing}
        width={width}
      />
    );

    expect(
      wrapper
        .find('[data-test-subj="properties-left"]')
        .find('[data-test-subj="timeline-description"]')
        .first()
        .props().value
    ).toEqual(description);
  });

  test('it does NOT render a description on the left when the width is less than the threshold', () => {
    const description = 'strange';
    const width = showDescriptionThreshold - 1;

    const wrapper = mount(
      <Properties
        associateNote={jest.fn()}
        createTimeline={jest.fn()}
        isFavorite={false}
        isLive={false}
        title=""
        description={description}
        getNotesByIds={jest.fn()}
        noteIds={[]}
        history={[]}
        timelineId="abc"
        updateDescription={jest.fn()}
        updateIsFavorite={jest.fn()}
        updateIsLive={jest.fn()}
        updateTitle={jest.fn()}
        updateNote={jest.fn()}
        usersViewing={usersViewing}
        width={width}
      />
    );

    expect(
      wrapper
        .find('[data-test-subj="properties-left"]')
        .find('[data-test-subj="timeline-description"]')
        .exists()
    ).toEqual(false);
  });

  test('it renders a notes button on the left', () => {
    const width = showDescriptionThreshold - 1;

    const wrapper = mount(
      <Properties
        associateNote={jest.fn()}
        createTimeline={jest.fn()}
        isFavorite={false}
        isLive={false}
        title=""
        description=""
        getNotesByIds={jest.fn()}
        noteIds={[]}
        history={[]}
        timelineId="abc"
        updateDescription={jest.fn()}
        updateIsFavorite={jest.fn()}
        updateIsLive={jest.fn()}
        updateTitle={jest.fn()}
        updateNote={jest.fn()}
        usersViewing={usersViewing}
        width={width}
      />
    );

    expect(
      wrapper
        .find('[data-test-subj="properties-left"]')
        .find('[data-test-subj="timeline-notes-button-large"]')
        .exists()
    ).toEqual(true);
  });

  test('it renders a history button on the right when the width is at least as wide as the threshold', () => {
    const width = showHistoryThreshold;

    const wrapper = mount(
      <Properties
        associateNote={jest.fn()}
        createTimeline={jest.fn()}
        isFavorite={false}
        isLive={false}
        title=""
        description=""
        getNotesByIds={jest.fn()}
        noteIds={[]}
        history={[]}
        timelineId="abc"
        updateDescription={jest.fn()}
        updateIsFavorite={jest.fn()}
        updateIsLive={jest.fn()}
        updateTitle={jest.fn()}
        updateNote={jest.fn()}
        usersViewing={usersViewing}
        width={width}
      />
    );

    expect(
      wrapper
        .find('[data-test-subj="properties-right"]')
        .find('[data-test-subj="timeline-history"]')
        .exists()
    ).toEqual(true);
  });

  test('it does NOT renders a history button on the right when the width is less than the threshold', () => {
    const width = showHistoryThreshold - 1;

    const wrapper = mount(
      <Properties
        associateNote={jest.fn()}
        createTimeline={jest.fn()}
        isFavorite={false}
        isLive={false}
        title=""
        description=""
        getNotesByIds={jest.fn()}
        noteIds={[]}
        history={[]}
        timelineId="abc"
        updateDescription={jest.fn()}
        updateIsFavorite={jest.fn()}
        updateIsLive={jest.fn()}
        updateTitle={jest.fn()}
        updateNote={jest.fn()}
        usersViewing={usersViewing}
        width={width}
      />
    );

    expect(
      wrapper
        .find('[data-test-subj="properties-right"]')
        .find('[data-test-subj="timeline-history"]')
        .exists()
    ).toEqual(false);
  });

  test('it renders a stream live button on the right when the width is at least as wide as the threshold', () => {
    const width = showStreamLiveThreshold;

    const wrapper = mount(
      <Properties
        associateNote={jest.fn()}
        createTimeline={jest.fn()}
        isFavorite={false}
        isLive={false}
        title=""
        description=""
        getNotesByIds={jest.fn()}
        noteIds={[]}
        history={[]}
        timelineId="abc"
        updateDescription={jest.fn()}
        updateIsFavorite={jest.fn()}
        updateIsLive={jest.fn()}
        updateTitle={jest.fn()}
        updateNote={jest.fn()}
        usersViewing={usersViewing}
        width={width}
      />
    );

    expect(
      wrapper
        .find('[data-test-subj="properties-right"]')
        .find('[data-test-subj="timeline-stream-live"]')
        .exists()
    ).toEqual(true);
  });

  test('it does NOT render a stream live button on the right when the width is less than the threshold', () => {
    const width = showStreamLiveThreshold - 1;

    const wrapper = mount(
      <Properties
        associateNote={jest.fn()}
        createTimeline={jest.fn()}
        isFavorite={false}
        isLive={false}
        title=""
        description=""
        getNotesByIds={jest.fn()}
        noteIds={[]}
        history={[]}
        timelineId="abc"
        updateDescription={jest.fn()}
        updateIsFavorite={jest.fn()}
        updateIsLive={jest.fn()}
        updateTitle={jest.fn()}
        updateNote={jest.fn()}
        usersViewing={usersViewing}
        width={width}
      />
    );

    expect(
      wrapper
        .find('[data-test-subj="properties-right"]')
        .find('[data-test-subj="timeline-stream-live"]')
        .exists()
    ).toEqual(false);
  });

  test('it renders a settings icon', () => {
    const wrapper = mount(
      <Properties
        associateNote={jest.fn()}
        createTimeline={jest.fn()}
        isFavorite={false}
        isLive={false}
        title=""
        description=""
        getNotesByIds={jest.fn()}
        noteIds={[]}
        history={[]}
        timelineId="abc"
        updateDescription={jest.fn()}
        updateIsFavorite={jest.fn()}
        updateIsLive={jest.fn()}
        updateTitle={jest.fn()}
        updateNote={jest.fn()}
        usersViewing={usersViewing}
        width={1000}
      />
    );

    expect(wrapper.find('[data-test-subj="settings-gear"]').exists()).toEqual(true);
  });

  test('it renders an avatar for the current user viewing the timeline when it has a title', () => {
    const title = 'port scan';

    const wrapper = mount(
      <Properties
        associateNote={jest.fn()}
        createTimeline={jest.fn()}
        isFavorite={false}
        isLive={false}
        title={title}
        description=""
        getNotesByIds={jest.fn()}
        noteIds={[]}
        history={[]}
        timelineId="abc"
        updateDescription={jest.fn()}
        updateIsFavorite={jest.fn()}
        updateIsLive={jest.fn()}
        updateTitle={jest.fn()}
        updateNote={jest.fn()}
        usersViewing={usersViewing}
        width={1000}
      />
    );

    expect(wrapper.find('[data-test-subj="avatar"]').exists()).toEqual(true);
  });

  test('it does NOT render an avatar for the current user viewing the timeline when it does NOT have a title', () => {
    const wrapper = mount(
      <Properties
        associateNote={jest.fn()}
        createTimeline={jest.fn()}
        isFavorite={false}
        isLive={false}
        title=""
        description=""
        getNotesByIds={jest.fn()}
        noteIds={[]}
        history={[]}
        timelineId="abc"
        updateDescription={jest.fn()}
        updateIsFavorite={jest.fn()}
        updateIsLive={jest.fn()}
        updateTitle={jest.fn()}
        updateNote={jest.fn()}
        usersViewing={usersViewing}
        width={1000}
      />
    );

    expect(wrapper.find('[data-test-subj="avatar"]').exists()).toEqual(false);
  });
});
