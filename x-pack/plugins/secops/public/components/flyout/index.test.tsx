/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import * as React from 'react';
import { Provider as ReduxStoreProvider } from 'react-redux';

import { set } from 'lodash/fp';
import { Flyout, FlyoutButton, FlyoutComponent, FlyoutPane } from '.';
import { createStore, State } from '../../store';

describe('Flyout', () => {
  const state: State = {
    local: {
      dragAndDrop: {
        dataProviders: {},
      },
      timeline: {
        timelineById: {
          test: {
            id: 'test',
            dataProviders: [],
            data: [],
            range: '1 Day',
            show: false,
            sort: {
              columnId: 'timestamp',
              sortDirection: 'descending',
            },
          },
        },
      },
    },
  };

  let store = createStore(state);

  beforeEach(() => {
    store = createStore(state);
  });

  describe('rendering', () => {
    test('it renders the default flyout state as a button', () => {
      const wrapper = mount(
        <ReduxStoreProvider store={store}>
          <Flyout timelineId="test" />
        </ReduxStoreProvider>
      );

      expect(
        wrapper
          .find('[data-test-subj="flyoutButton"]')
          .first()
          .text()
      ).toContain('T I M E L I N E');
    });

    test('it renders the title element when its state is set to flyout is true', () => {
      const stateShowIsTrue = set('local.timeline.timelineById.test.show', true, state);
      const storeShowIsTrue = createStore(stateShowIsTrue);

      const wrapper = mount(
        <ReduxStoreProvider store={storeShowIsTrue}>
          <Flyout timelineId="test" />
        </ReduxStoreProvider>
      );

      expect(
        wrapper
          .find('[data-test-subj="flyoutTitle"]')
          .first()
          .text()
      ).toContain('Timeline');
    });

    test('it does NOT render the fly out button when its state is set to flyout is true', () => {
      const stateShowIsTrue = set('local.timeline.timelineById.test.show', true, state);
      const storeShowIsTrue = createStore(stateShowIsTrue);

      const wrapper = mount(
        <ReduxStoreProvider store={storeShowIsTrue}>
          <Flyout timelineId="test" />
        </ReduxStoreProvider>
      );

      expect(wrapper.find('[data-test-subj="flyoutButton"]').exists()).toEqual(false);
    });

    test('it renders children elements when its state is set to flyout is true', () => {
      const stateShowIsTrue = set('local.timeline.timelineById.test.show', true, state);
      const storeShowIsTrue = createStore(stateShowIsTrue);

      const wrapper = mount(
        <ReduxStoreProvider store={storeShowIsTrue}>
          <Flyout timelineId="test">
            <p>I am a child of flyout</p>
          </Flyout>
        </ReduxStoreProvider>
      );

      expect(
        wrapper
          .find('[data-test-subj="flyoutChildren"]')
          .first()
          .text()
      ).toContain('I am a child of flyout');
    });

    test('should call the onOpen when the mouse is entered for rendering', () => {
      const showTimeline = jest.fn();
      const wrapper = mount(
        <ReduxStoreProvider store={store}>
          <FlyoutComponent show={false} timelineId="test" showTimeline={showTimeline} />
        </ReduxStoreProvider>
      );

      wrapper
        .find('[data-test-subj="flyoutOverlay"]')
        .first()
        .simulate('mouseenter');

      expect(showTimeline).toBeCalled();
    });

    test('should call the onClose when the close button is clicked', () => {
      const stateShowIsTrue = set('local.timeline.timelineById.test.show', true, state);
      const storeShowIsTrue = createStore(stateShowIsTrue);

      const showTimeline = jest.fn();
      const wrapper = mount(
        <ReduxStoreProvider store={storeShowIsTrue}>
          <FlyoutComponent show={true} timelineId="test" showTimeline={showTimeline} />
        </ReduxStoreProvider>
      );

      wrapper
        .find('[data-test-subj="flyout"] button')
        .first()
        .simulate('click');

      expect(showTimeline).toBeCalled();
    });
  });

  describe('FlyoutPane', () => {
    test('should return the flyout element with a title', () => {
      const closeMock = jest.fn();
      const wrapper = mount(
        <FlyoutPane onClose={closeMock}>
          <span>I am a child of flyout</span>,
        </FlyoutPane>
      );
      expect(
        wrapper
          .find('[data-test-subj="flyoutTitle"]')
          .first()
          .text()
      ).toContain('Timeline');
    });

    test('should return the flyout element with children', () => {
      const closeMock = jest.fn();
      const wrapper = mount(
        <FlyoutPane onClose={closeMock}>
          <span>I am a mock child</span>,
        </FlyoutPane>
      );
      expect(
        wrapper
          .find('[data-test-subj="flyoutChildren"]')
          .first()
          .text()
      ).toContain('I am a mock child');
    });

    test('should call the onClose when the close button is clicked', () => {
      const closeMock = jest.fn();
      const wrapper = mount(
        <FlyoutPane onClose={closeMock}>
          <span>I am a mock child</span>,
        </FlyoutPane>
      );
      wrapper
        .find('[data-test-subj="flyout"] button')
        .first()
        .simulate('click');

      expect(closeMock).toBeCalled();
    });
  });

  describe('showFlyoutButton', () => {
    test('should show the flyout button when show is true', () => {
      const openMock = jest.fn();
      const wrapper = mount(<FlyoutButton show={true} timelineId="test" onOpen={openMock} />);
      expect(wrapper.find('[data-test-subj="flyoutButton"]').exists()).toEqual(true);
    });

    test('should NOT show the flyout button when show is false', () => {
      const openMock = jest.fn();
      const wrapper = mount(<FlyoutButton show={false} timelineId="test" onOpen={openMock} />);
      expect(wrapper.find('[data-test-subj="flyoutButton"]').exists()).toEqual(false);
    });

    test('should return the flyout button with text', () => {
      const openMock = jest.fn();
      const wrapper = mount(<FlyoutButton show={true} timelineId="test" onOpen={openMock} />);
      expect(
        wrapper
          .find('[data-test-subj="flyoutButton"]')
          .first()
          .text()
      ).toContain('T I M E L I N E');
    });

    test('should call the onOpen when the mouse is entered', () => {
      const openMock = jest.fn();
      const wrapper = mount(<FlyoutButton show={true} timelineId="test" onOpen={openMock} />);
      wrapper
        .find('[data-test-subj="flyoutOverlay"]')
        .first()
        .simulate('mouseenter');

      expect(openMock).toBeCalled();
    });
  });
});
