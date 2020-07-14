/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../../../common/mock';
import { Pane } from '.';

const testFlyoutHeight = 980;
const testWidth = 640;

describe('Pane', () => {
  test('renders correctly against snapshot', () => {
    const EmptyComponent = shallow(
      <TestProviders>
        <Pane
          flyoutHeight={testFlyoutHeight}
          onClose={jest.fn()}
          timelineId={'test'}
          width={testWidth}
        >
          <span>{'I am a child of flyout'}</span>
        </Pane>
      </TestProviders>
    );
    expect(EmptyComponent.find('Pane')).toMatchSnapshot();
  });

  test('it should NOT let the flyout expand to take up the full width of the element that contains it', () => {
    const wrapper = mount(
      <TestProviders>
        <Pane
          flyoutHeight={testFlyoutHeight}
          onClose={jest.fn()}
          timelineId={'test'}
          width={testWidth}
        >
          <span>{'I am a child of flyout'}</span>
        </Pane>
      </TestProviders>
    );

    expect(wrapper.find('Resizable').get(0).props.maxWidth).toEqual('95vw');
  });

  test('it should render a resize handle', () => {
    const wrapper = mount(
      <TestProviders>
        <Pane
          flyoutHeight={testFlyoutHeight}
          onClose={jest.fn()}
          timelineId={'test'}
          width={testWidth}
        >
          <span>{'I am a child of flyout'}</span>
        </Pane>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="flyout-resize-handle"]').first().exists()).toEqual(true);
  });

  test('it should render children', () => {
    const wrapper = mount(
      <TestProviders>
        <Pane
          flyoutHeight={testFlyoutHeight}
          onClose={jest.fn()}
          timelineId={'test'}
          width={testWidth}
        >
          <span>{'I am a mock body'}</span>
        </Pane>
      </TestProviders>
    );
    expect(wrapper.first().text()).toContain('I am a mock body');
  });
});
