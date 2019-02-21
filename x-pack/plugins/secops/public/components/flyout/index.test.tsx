/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { mount } from 'enzyme';
import { set } from 'lodash/fp';
import * as React from 'react';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { ThemeProvider } from 'styled-components';

import { ActionCreator } from 'typescript-fsa';
import { Flyout, FlyoutComponent, flyoutHeaderHeight } from '.';
import { mockGlobalState } from '../../mock';
import { createStore, State } from '../../store';
import { DragDropContextWrapper } from '../drag_and_drop/drag_drop_context_wrapper';
import { mockDataProviders } from '../timeline/data_providers/mock/mock_data_providers';
import { FlyoutButton } from './button';
import { FlyoutPane } from './pane';

const testFlyoutHeight = 980;
const testWidth = 640;
const usersViewing = ['elastic'];

describe('Flyout', () => {
  const state: State = mockGlobalState;
  const theme = () => ({ eui: euiDarkVars, darkMode: true });

  let store = createStore(state);

  beforeEach(() => {
    store = createStore(state);
  });

  describe('rendering', () => {
    test('it renders the default flyout state as a button', () => {
      const wrapper = mount(
        <ReduxStoreProvider store={store}>
          <ThemeProvider theme={theme()}>
            <DragDropContextWrapper>
              <Flyout
                flyoutHeight={testFlyoutHeight}
                headerHeight={flyoutHeaderHeight}
                timelineId="test"
                usersViewing={usersViewing}
              />
            </DragDropContextWrapper>
          </ThemeProvider>
        </ReduxStoreProvider>
      );

      expect(
        wrapper
          .find('[data-test-subj="flyoutButton"]')
          .first()
          .text()
      ).toContain('T I M E L I N E');
    });

    test('it renders the title field when its state is set to flyout is true', () => {
      const stateShowIsTrue = set('local.timeline.timelineById.test.show', true, state);
      const storeShowIsTrue = createStore(stateShowIsTrue);

      const wrapper = mount(
        <ReduxStoreProvider store={storeShowIsTrue}>
          <ThemeProvider theme={theme()}>
            <DragDropContextWrapper>
              <Flyout
                flyoutHeight={testFlyoutHeight}
                headerHeight={flyoutHeaderHeight}
                timelineId="test"
                usersViewing={usersViewing}
              />
            </DragDropContextWrapper>
          </ThemeProvider>
        </ReduxStoreProvider>
      );

      expect(
        wrapper
          .find('[data-test-subj="timeline-title"]')
          .first()
          .props().placeholder
      ).toContain('Untitled Timeline');
    });

    test('it does NOT render the fly out button when its state is set to flyout is true', () => {
      const stateShowIsTrue = set('local.timeline.timelineById.test.show', true, state);
      const storeShowIsTrue = createStore(stateShowIsTrue);

      const wrapper = mount(
        <ReduxStoreProvider store={storeShowIsTrue}>
          <ThemeProvider theme={theme()}>
            <DragDropContextWrapper>
              <Flyout
                flyoutHeight={testFlyoutHeight}
                headerHeight={flyoutHeaderHeight}
                timelineId="test"
                usersViewing={usersViewing}
              />
            </DragDropContextWrapper>
          </ThemeProvider>
        </ReduxStoreProvider>
      );

      expect(wrapper.find('[data-test-subj="flyoutButton"]').exists()).toEqual(false);
    });

    test('it renders children elements when its state is set to flyout is true', () => {
      const stateShowIsTrue = set('local.timeline.timelineById.test.show', true, state);
      const storeShowIsTrue = createStore(stateShowIsTrue);

      const wrapper = mount(
        <ReduxStoreProvider store={storeShowIsTrue}>
          <ThemeProvider theme={theme()}>
            <DragDropContextWrapper>
              <Flyout
                flyoutHeight={testFlyoutHeight}
                headerHeight={flyoutHeaderHeight}
                timelineId="test"
                usersViewing={usersViewing}
              >
                <p>I am a child of flyout</p>
              </Flyout>
            </DragDropContextWrapper>
          </ThemeProvider>
        </ReduxStoreProvider>
      );

      expect(
        wrapper
          .find('[data-test-subj="flyoutChildren"]')
          .first()
          .text()
      ).toContain('I am a child of flyout');
    });

    test('it does render the data providers badge when the number is greater than 0', () => {
      const stateWithDataProviders = set(
        'local.timeline.timelineById.test.dataProviders',
        mockDataProviders,
        state
      );
      const storeWithDataProviders = createStore(stateWithDataProviders);

      const wrapper = mount(
        <ReduxStoreProvider store={storeWithDataProviders}>
          <ThemeProvider theme={theme()}>
            <DragDropContextWrapper>
              <Flyout
                flyoutHeight={testFlyoutHeight}
                headerHeight={flyoutHeaderHeight}
                timelineId="test"
                usersViewing={usersViewing}
              />
            </DragDropContextWrapper>
          </ThemeProvider>
        </ReduxStoreProvider>
      );

      expect(wrapper.find('[data-test-subj="badge"]').exists()).toEqual(true);
    });

    test('it renders the correct number of data providers badge when the number is greater than 0', () => {
      const stateWithDataProviders = set(
        'local.timeline.timelineById.test.dataProviders',
        mockDataProviders,
        state
      );
      const storeWithDataProviders = createStore(stateWithDataProviders);

      const wrapper = mount(
        <ReduxStoreProvider store={storeWithDataProviders}>
          <ThemeProvider theme={theme()}>
            <DragDropContextWrapper>
              <Flyout
                flyoutHeight={testFlyoutHeight}
                headerHeight={flyoutHeaderHeight}
                timelineId="test"
                usersViewing={usersViewing}
              />
            </DragDropContextWrapper>
          </ThemeProvider>
        </ReduxStoreProvider>
      );

      expect(
        wrapper
          .find('[data-test-subj="badge"]')
          .first()
          .text()
      ).toContain('10');
    });

    test('it does NOT render the data providers badge when the number is equal to 0', () => {
      const wrapper = mount(
        <ReduxStoreProvider store={store}>
          <ThemeProvider theme={theme()}>
            <DragDropContextWrapper>
              <Flyout
                flyoutHeight={testFlyoutHeight}
                headerHeight={flyoutHeaderHeight}
                timelineId="test"
                usersViewing={usersViewing}
              />
            </DragDropContextWrapper>
          </ThemeProvider>
        </ReduxStoreProvider>
      );

      expect(wrapper.find('[data-test-subj="badge"]').exists()).toEqual(false);
    });

    test('should call the onOpen when the mouse is clicked for rendering', () => {
      const showTimeline = (jest.fn() as unknown) as ActionCreator<{ id: string; show: boolean }>;
      const wrapper = mount(
        <ReduxStoreProvider store={store}>
          <ThemeProvider theme={theme()}>
            <DragDropContextWrapper>
              <FlyoutComponent
                dataProviders={mockDataProviders}
                flyoutHeight={testFlyoutHeight}
                headerHeight={flyoutHeaderHeight}
                show={false}
                showTimeline={showTimeline}
                timelineId="test"
                usersViewing={usersViewing}
              />
            </DragDropContextWrapper>
          </ThemeProvider>
        </ReduxStoreProvider>
      );

      wrapper
        .find('[data-test-subj="flyoutOverlay"]')
        .first()
        .simulate('click');

      expect(showTimeline).toBeCalled();
    });

    test('should call the onClose when the close button is clicked', () => {
      const stateShowIsTrue = set('local.timeline.timelineById.test.show', true, state);
      const storeShowIsTrue = createStore(stateShowIsTrue);

      const showTimeline = (jest.fn() as unknown) as ActionCreator<{ id: string; show: boolean }>;
      const wrapper = mount(
        <ReduxStoreProvider store={storeShowIsTrue}>
          <ThemeProvider theme={theme()}>
            <DragDropContextWrapper>
              <FlyoutComponent
                dataProviders={mockDataProviders}
                flyoutHeight={testFlyoutHeight}
                headerHeight={flyoutHeaderHeight}
                show={true}
                showTimeline={showTimeline}
                timelineId="test"
                usersViewing={usersViewing}
              />
            </DragDropContextWrapper>
          </ThemeProvider>
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
    test('should return the flyout element with an empty title', () => {
      const closeMock = jest.fn();
      const wrapper = mount(
        <ReduxStoreProvider store={store}>
          <ThemeProvider theme={theme()}>
            <DragDropContextWrapper>
              <FlyoutPane
                flyoutHeight={testFlyoutHeight}
                headerHeight={flyoutHeaderHeight}
                onClose={closeMock}
                timelineId={'test'}
                usersViewing={usersViewing}
                width={testWidth}
              >
                <span>I am a child of flyout</span>,
              </FlyoutPane>
            </DragDropContextWrapper>
          </ThemeProvider>
        </ReduxStoreProvider>
      );

      expect(
        wrapper
          .find('[data-test-subj="timeline-title"]')
          .first()
          .text()
      ).toContain('');
    });

    test('should return the flyout element with children', () => {
      const closeMock = jest.fn();
      const wrapper = mount(
        <ReduxStoreProvider store={store}>
          <ThemeProvider theme={theme()}>
            <DragDropContextWrapper>
              <FlyoutPane
                flyoutHeight={testFlyoutHeight}
                headerHeight={flyoutHeaderHeight}
                onClose={closeMock}
                timelineId={'test'}
                usersViewing={usersViewing}
                width={testWidth}
              >
                <span>I am a mock child</span>,
              </FlyoutPane>
            </DragDropContextWrapper>
          </ThemeProvider>
        </ReduxStoreProvider>
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
        <ReduxStoreProvider store={store}>
          <ThemeProvider theme={theme()}>
            <DragDropContextWrapper>
              <FlyoutPane
                flyoutHeight={testFlyoutHeight}
                headerHeight={flyoutHeaderHeight}
                onClose={closeMock}
                timelineId={'test'}
                usersViewing={usersViewing}
                width={testWidth}
              >
                <span>I am a mock child</span>,
              </FlyoutPane>
            </DragDropContextWrapper>
          </ThemeProvider>
        </ReduxStoreProvider>
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
      const wrapper = mount(
        <ReduxStoreProvider store={store}>
          <ThemeProvider theme={theme()}>
            <DragDropContextWrapper>
              <FlyoutButton
                dataProviders={mockDataProviders}
                show={true}
                timelineId="test"
                onOpen={openMock}
              />
            </DragDropContextWrapper>
          </ThemeProvider>
        </ReduxStoreProvider>
      );
      expect(wrapper.find('[data-test-subj="flyoutButton"]').exists()).toEqual(true);
    });

    test('should NOT show the flyout button when show is false', () => {
      const openMock = jest.fn();
      const wrapper = mount(
        <ReduxStoreProvider store={store}>
          <ThemeProvider theme={theme()}>
            <DragDropContextWrapper>
              <FlyoutButton
                dataProviders={mockDataProviders}
                show={false}
                timelineId="test"
                onOpen={openMock}
              />
            </DragDropContextWrapper>
          </ThemeProvider>
        </ReduxStoreProvider>
      );
      expect(wrapper.find('[data-test-subj="flyoutButton"]').exists()).toEqual(false);
    });

    test('should return the flyout button with text', () => {
      const openMock = jest.fn();
      const wrapper = mount(
        <ReduxStoreProvider store={store}>
          <ThemeProvider theme={theme()}>
            <DragDropContextWrapper>
              <FlyoutButton
                dataProviders={mockDataProviders}
                show={true}
                timelineId="test"
                onOpen={openMock}
              />
            </DragDropContextWrapper>
          </ThemeProvider>
        </ReduxStoreProvider>
      );
      expect(
        wrapper
          .find('[data-test-subj="flyoutButton"]')
          .first()
          .text()
      ).toContain('T I M E L I N E');
    });

    test('should call the onOpen when it is clicked', () => {
      const openMock = jest.fn();
      const wrapper = mount(
        <ReduxStoreProvider store={store}>
          <ThemeProvider theme={theme()}>
            <DragDropContextWrapper>
              <FlyoutButton
                dataProviders={mockDataProviders}
                show={true}
                timelineId="test"
                onOpen={openMock}
              />
            </DragDropContextWrapper>
          </ThemeProvider>
        </ReduxStoreProvider>
      );
      wrapper
        .find('[data-test-subj="flyoutOverlay"]')
        .first()
        .simulate('click');

      expect(openMock).toBeCalled();
    });
  });
});
