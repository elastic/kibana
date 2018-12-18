/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import { set } from 'lodash/fp';
import * as React from 'react';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { ThemeProvider } from 'styled-components';

import * as euiVars from '@elastic/eui/dist/eui_theme_k6_light.json';
import { Flyout, FlyoutComponent, flyoutHeaderHeight } from '.';
import { createStore, State } from '../../store';
import { DEFAULT_PAGE_COUNT } from '../../store/local/timeline/model';
import { DragDropContextWrapper } from '../drag_and_drop/drag_drop_context_wrapper';
import { defaultWidth } from '../timeline/body';
import { mockDataProviders } from '../timeline/data_providers/mock/mock_data_providers';
import { FlyoutButton } from './button';
import { FlyoutPane } from './pane';

const testFlyoutHeight = 980;
const testWidth = 640;

describe('Flyout', () => {
  const state: State = {
    local: {
      app: {
        notesById: {},
        theme: 'dark',
      },
      hosts: {
        limit: 2,
      },
      dragAndDrop: {
        dataProviders: {},
      },
      inputs: {
        global: {
          timerange: {
            kind: 'absolute',
            from: 0,
            to: 1,
          },
          query: [],
          policy: {
            kind: 'manual',
            duration: 5000,
          },
        },
      },
      timeline: {
        timelineById: {
          test: {
            activePage: 0,
            dataProviders: [],
            description: '',
            eventIdToNoteIds: {},
            historyIds: [],
            id: 'test',
            isFavorite: false,
            isLive: false,
            itemsPerPage: 25,
            itemsPerPageOptions: [10, 25, 50],
            kqlMode: 'filter',
            kqlQuery: '',
            title: '',
            noteIds: [],
            pageCount: DEFAULT_PAGE_COUNT,
            pinnedEventIds: {},
            range: '1 Day',
            show: false,
            sort: {
              columnId: 'timestamp',
              sortDirection: 'descending',
            },
            width: defaultWidth,
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
          <ThemeProvider theme={{ eui: euiVars }}>
            <DragDropContextWrapper>
              <Flyout
                flyoutHeight={testFlyoutHeight}
                headerHeight={flyoutHeaderHeight}
                timelineId="test"
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
          <ThemeProvider theme={{ eui: euiVars }}>
            <DragDropContextWrapper>
              <Flyout
                flyoutHeight={testFlyoutHeight}
                headerHeight={flyoutHeaderHeight}
                timelineId="test"
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
          <ThemeProvider theme={{ eui: euiVars }}>
            <DragDropContextWrapper>
              <Flyout
                flyoutHeight={testFlyoutHeight}
                headerHeight={flyoutHeaderHeight}
                timelineId="test"
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
          <ThemeProvider theme={{ eui: euiVars }}>
            <DragDropContextWrapper>
              <Flyout
                flyoutHeight={testFlyoutHeight}
                headerHeight={flyoutHeaderHeight}
                timelineId="test"
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
          <ThemeProvider theme={{ eui: euiVars }}>
            <DragDropContextWrapper>
              <Flyout
                flyoutHeight={testFlyoutHeight}
                headerHeight={flyoutHeaderHeight}
                timelineId="test"
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
          <ThemeProvider theme={{ eui: euiVars }}>
            <DragDropContextWrapper>
              <Flyout
                flyoutHeight={testFlyoutHeight}
                headerHeight={flyoutHeaderHeight}
                timelineId="test"
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
          <ThemeProvider theme={{ eui: euiVars }}>
            <DragDropContextWrapper>
              <Flyout
                flyoutHeight={testFlyoutHeight}
                headerHeight={flyoutHeaderHeight}
                timelineId="test"
              />
            </DragDropContextWrapper>
          </ThemeProvider>
        </ReduxStoreProvider>
      );

      expect(wrapper.find('[data-test-subj="badge"]').exists()).toEqual(false);
    });

    test('should call the onOpen when the mouse is clicked for rendering', () => {
      const showTimeline = jest.fn();
      const wrapper = mount(
        <ReduxStoreProvider store={store}>
          <ThemeProvider theme={{ eui: euiVars }}>
            <DragDropContextWrapper>
              <FlyoutComponent
                dataProviders={mockDataProviders}
                flyoutHeight={testFlyoutHeight}
                headerHeight={flyoutHeaderHeight}
                show={false}
                timelineId="test"
                showTimeline={showTimeline}
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

      const showTimeline = jest.fn();
      const wrapper = mount(
        <ReduxStoreProvider store={storeShowIsTrue}>
          <ThemeProvider theme={{ eui: euiVars }}>
            <DragDropContextWrapper>
              <FlyoutComponent
                dataProviders={mockDataProviders}
                flyoutHeight={testFlyoutHeight}
                headerHeight={flyoutHeaderHeight}
                show={true}
                timelineId="test"
                showTimeline={showTimeline}
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
          <ThemeProvider theme={{ eui: euiVars }}>
            <DragDropContextWrapper>
              <FlyoutPane
                flyoutHeight={testFlyoutHeight}
                headerHeight={flyoutHeaderHeight}
                onClose={closeMock}
                timelineId={'test'}
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
          <ThemeProvider theme={{ eui: euiVars }}>
            <DragDropContextWrapper>
              <FlyoutPane
                flyoutHeight={testFlyoutHeight}
                headerHeight={flyoutHeaderHeight}
                onClose={closeMock}
                timelineId={'test'}
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
          <ThemeProvider theme={{ eui: euiVars }}>
            <DragDropContextWrapper>
              <FlyoutPane
                flyoutHeight={testFlyoutHeight}
                headerHeight={flyoutHeaderHeight}
                onClose={closeMock}
                timelineId={'test'}
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
          <DragDropContextWrapper>
            <FlyoutButton
              dataProviders={mockDataProviders}
              show={true}
              theme="dark"
              timelineId="test"
              onOpen={openMock}
            />{' '}
          </DragDropContextWrapper>
        </ReduxStoreProvider>
      );
      expect(wrapper.find('[data-test-subj="flyoutButton"]').exists()).toEqual(true);
    });

    test('should NOT show the flyout button when show is false', () => {
      const openMock = jest.fn();
      const wrapper = mount(
        <ReduxStoreProvider store={store}>
          <DragDropContextWrapper>
            <FlyoutButton
              dataProviders={mockDataProviders}
              show={false}
              theme="dark"
              timelineId="test"
              onOpen={openMock}
            />{' '}
          </DragDropContextWrapper>
        </ReduxStoreProvider>
      );
      expect(wrapper.find('[data-test-subj="flyoutButton"]').exists()).toEqual(false);
    });

    test('should return the flyout button with text', () => {
      const openMock = jest.fn();
      const wrapper = mount(
        <ReduxStoreProvider store={store}>
          <DragDropContextWrapper>
            <FlyoutButton
              dataProviders={mockDataProviders}
              show={true}
              theme="dark"
              timelineId="test"
              onOpen={openMock}
            />{' '}
          </DragDropContextWrapper>
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
          <DragDropContextWrapper>
            <FlyoutButton
              dataProviders={mockDataProviders}
              show={true}
              theme="dark"
              timelineId="test"
              onOpen={openMock}
            />
          </DragDropContextWrapper>
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
