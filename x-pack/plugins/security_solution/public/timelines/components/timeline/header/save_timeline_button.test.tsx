/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';

import { SaveTimelineButton } from './save_timeline_button';
import { act } from '@testing-library/react-hooks';

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useDispatch: jest.fn(),
  };
});

jest.mock('./title_and_description');

describe('SaveTimelineButton', () => {
  const props = {
    timelineId: 'timeline-1',
    showOverlay: false,
    toolTip: 'tooltip message',
    toggleSaveTimeline: jest.fn(),
    onSaveTimeline: jest.fn(),
    updateTitle: jest.fn(),
    updateDescription: jest.fn(),
  };
  test('Show tooltip', () => {
    const component = shallow(<SaveTimelineButton {...props} />);
    expect(component.find('[data-test-subj="save-timeline-btn-tooltip"]').exists()).toEqual(true);
  });

  test('Hide tooltip', () => {
    const testProps = {
      ...props,
      showOverlay: true,
    };
    const component = mount(<SaveTimelineButton {...testProps} />);
    component.find('[data-test-subj="save-timeline-button-icon"]').first().simulate('click');

    act(() => {
      expect(component.find('[data-test-subj="save-timeline-btn-tooltip"]').exists()).toEqual(
        false
      );
    });
  });

  test('should show a button with pencil icon', () => {
    const component = shallow(<SaveTimelineButton {...props} />);
    expect(component.find('[data-test-subj="save-timeline-button-icon"]').prop('iconType')).toEqual(
      'pencil'
    );
  });

  test('should not show a modal when showOverlay equals false', () => {
    const component = shallow(<SaveTimelineButton {...props} />);
    expect(component.find('[data-test-subj="save-timeline-modal"]').exists()).toEqual(false);
  });

  test('should show a modal when showOverlay equals true', () => {
    const testProps = {
      ...props,
      showOverlay: true,
    };
    const component = mount(<SaveTimelineButton {...testProps} />);
    component.find('[data-test-subj="save-timeline-button-icon"]').first().simulate('click');
    act(() => {
      expect(component.find('[data-test-subj="save-timeline-modal"]').exists()).toEqual(true);
    });
  });
});
