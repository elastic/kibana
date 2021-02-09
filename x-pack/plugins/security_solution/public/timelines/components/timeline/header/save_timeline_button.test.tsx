/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { SaveTimelineButton } from './save_timeline_button';
import { TestProviders } from '../../../../common/mock';
jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useDispatch: jest.fn(),
  };
});
jest.mock('../../../../common/lib/kibana');
jest.mock('./title_and_description');
describe('SaveTimelineButton', () => {
  const props = {
    initialFocus: 'title' as const,
    timelineId: 'timeline-1',
    toolTip: 'tooltip message',
  };
  test('Show tooltip', () => {
    const component = mount(
      <TestProviders>
        <SaveTimelineButton {...props} />
      </TestProviders>
    );
    expect(component.find('[data-test-subj="save-timeline-btn-tooltip"]').exists()).toEqual(true);
  });
  test('Hide tooltip', () => {
    const component = mount(
      <TestProviders>
        <SaveTimelineButton {...props} />
      </TestProviders>
    );
    component.find('[data-test-subj="save-timeline-button-icon"]').first().simulate('click');
    expect(component.find('[data-test-subj="save-timeline-btn-tooltip"]').exists()).toEqual(false);
  });
  test('should show a button with pencil icon', () => {
    const component = mount(
      <TestProviders>
        <SaveTimelineButton {...props} />
      </TestProviders>
    );
    expect(
      component.find('[data-test-subj="save-timeline-button-icon"]').first().prop('iconType')
    ).toEqual('pencil');
  });
  test('should not show a modal when showOverlay equals false', () => {
    const component = mount(
      <TestProviders>
        <SaveTimelineButton {...props} />
      </TestProviders>
    );
    expect(component.find('[data-test-subj="save-timeline-modal"]').exists()).toEqual(false);
  });
  test('should show a modal when showOverlay equals true', () => {
    const component = mount(
      <TestProviders>
        <SaveTimelineButton {...props} />
      </TestProviders>
    );
    expect(component.find('[data-test-subj="save-timeline-btn-tooltip"]').exists()).toEqual(true);
    expect(component.find('[data-test-subj="save-timeline-modal-comp"]').exists()).toEqual(false);
    component.find('[data-test-subj="save-timeline-button-icon"]').first().simulate('click');
    expect(component.find('[data-test-subj="save-timeline-btn-tooltip"]').exists()).toEqual(false);
    expect(component.find('[data-test-subj="save-timeline-modal-comp"]').exists()).toEqual(true);
  });
});
