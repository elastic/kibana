/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import { waitFor } from '@testing-library/react';
import * as i18n from '../translations';

import { OpenTimelineModalButton } from './open_timeline_modal_button';

describe('OpenTimelineModalButton', () => {
  test('it renders the expected button text', async () => {
    const wrapper = mount(<OpenTimelineModalButton onClick={jest.fn()} />);

    await waitFor(() => {
      wrapper.update();

      expect(wrapper.find('[data-test-subj="open-timeline-button"]').first().text()).toEqual(
        i18n.OPEN_TIMELINE
      );
    });
  });

  describe('onClick prop', () => {
    test('it invokes onClick function provided as a prop when the button is clicked', async () => {
      const onClick = jest.fn();
      const wrapper = mount(<OpenTimelineModalButton onClick={onClick} />);

      await waitFor(() => {
        wrapper.find('[data-test-subj="open-timeline-button"]').first().simulate('click');

        wrapper.update();

        expect(onClick).toBeCalled();
      });
    });
  });
});
