/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { SaveTimelineComponent } from './save_timeline';

describe('SaveTimelineComponent', () => {
  const props = {
    timelineId: 'timeline-1',
    showOverlay: false,
    toggleSaveTimeline: jest.fn(),
    onSaveTimeline: jest.fn(),
    updateTitle: jest.fn(),
    updateDescription: jest.fn(),
  };
  test('should show a button with pencil icon', () => {
    const component = shallow(<SaveTimelineComponent {...props} />);
    expect(component.find('[data-test-subj="save-timeline-button-icon"]').prop('iconType')).toEqual(
      'pencil'
    );
  });

  test('should show a modal when showOverlay equals true', () => {
    const testProps = {
      ...props,
      showOverlay: true,
    };
    const component = shallow(<SaveTimelineComponent {...testProps} />);
    expect(component.find('[data-test-subj="save-timeline-modal"]').exists()).toEqual(true);
  });

  test('should not show a modal when showOverlay equals false', () => {
    const component = shallow(<SaveTimelineComponent {...props} />);
    expect(component.find('[data-test-subj="save-timeline-modal"]').exists()).toEqual(false);
  });
});
