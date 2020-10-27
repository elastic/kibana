/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { SaveTimelineButton } from './save_timeline_button';

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
    const component = shallow(<SaveTimelineButton {...testProps} />);
    expect(component.find('[data-test-subj="save-timeline-btn-tooltip"]').exists()).toEqual(false);
  });
});
