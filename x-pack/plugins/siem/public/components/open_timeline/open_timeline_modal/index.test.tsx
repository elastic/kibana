/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import * as React from 'react';

import { OpenTimelineModalButton } from '.';

import * as i18n from '../translations';

describe('OpenTimelineModalButton', () => {
  test('it renders the expected button text', () => {
    const wrapper = mountWithIntl(<OpenTimelineModalButton onToggle={jest.fn()} />);

    expect(
      wrapper
        .find('[data-test-subj="open-timeline-button"]')
        .first()
        .text()
    ).toEqual(i18n.OPEN_TIMELINE);
  });

  describe('statefulness', () => {
    test('defaults showModal to false', () => {
      const wrapper = mountWithIntl(<OpenTimelineModalButton onToggle={jest.fn()} />);

      expect(get('showModal', wrapper.state())).toEqual(false);
    });

    test('it sets showModal to true when the button is clicked', () => {
      const wrapper = mountWithIntl(<OpenTimelineModalButton onToggle={jest.fn()} />);

      wrapper
        .find('[data-test-subj="open-timeline-button"]')
        .first()
        .simulate('click');

      expect(get('showModal', wrapper.state())).toEqual(true);
    });

    test('it does NOT render the modal when showModal is false', () => {
      const wrapper = mountWithIntl(<OpenTimelineModalButton onToggle={jest.fn()} />);

      expect(
        wrapper
          .find('[data-test-subj="open-timeline-modal"]')
          .first()
          .exists()
      ).toBe(false);
    });

    test('it renders the modal when showModal is true', () => {
      const wrapper = mountWithIntl(<OpenTimelineModalButton onToggle={jest.fn()} />);

      wrapper
        .find('[data-test-subj="open-timeline-button"]')
        .first()
        .simulate('click');

      expect(
        wrapper
          .find('[data-test-subj="open-timeline-modal"]')
          .first()
          .exists()
      ).toBe(true);
    });
  });

  describe('onToggle prop', () => {
    test('it still correctly updates the showModal state if `onToggle` is not provided as a prop', () => {
      const wrapper = mountWithIntl(<OpenTimelineModalButton />);

      wrapper
        .find('[data-test-subj="open-timeline-button"]')
        .first()
        .simulate('click');

      expect(get('showModal', wrapper.state())).toEqual(true);
    });

    test('it invokes the optional onToggle function provided as a prop when the open timeline button is clicked', () => {
      const onToggle = jest.fn();
      const wrapper = mountWithIntl(<OpenTimelineModalButton onToggle={onToggle} />);

      wrapper
        .find('[data-test-subj="open-timeline-button"]')
        .first()
        .simulate('click');

      expect(onToggle).toBeCalled();
    });
  });
});
