/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount, shallow } from 'enzyme';
import { set } from '@elastic/safer-lodash-set/fp';
import React from 'react';
import '../../../common/mock/react_beautiful_dnd';

import {
  mockGlobalState,
  TestProviders,
  SUB_PLUGINS_REDUCER,
  kibanaObservable,
  createSecuritySolutionStorageMock,
} from '../../../common/mock';
import { TimelineId } from '../../../../common/types/timeline';
import { createStore, State } from '../../../common/store';
import * as timelineActions from '../../store/timeline/actions';

import { Flyout } from '.';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

jest.mock('../timeline', () => ({
  StatefulTimeline: () => <div />,
}));

describe('Flyout', () => {
  const state: State = mockGlobalState;
  const { storage } = createSecuritySolutionStorageMock();
  const props = {
    onAppLeave: jest.fn(),
    timelineId: TimelineId.test,
  };

  beforeEach(() => {
    mockDispatch.mockClear();
  });

  describe('rendering', () => {
    test('it renders correctly against snapshot', () => {
      const wrapper = shallow(
        <TestProviders>
          <Flyout {...props} />
        </TestProviders>
      );
      expect(wrapper.find('Flyout')).toMatchSnapshot();
    });

    test('it renders the default flyout state as a bottom bar', () => {
      const wrapper = mount(
        <TestProviders>
          <Flyout {...props} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="flyoutBottomBar"]').first().text()).toContain(
        'Untitled timeline'
      );
    });

    test('it does NOT render the fly out bottom bar when its state is set to flyout is true', () => {
      const stateShowIsTrue = set('timeline.timelineById.test.show', true, state);
      const storeShowIsTrue = createStore(
        stateShowIsTrue,
        SUB_PLUGINS_REDUCER,
        kibanaObservable,
        storage
      );

      const wrapper = mount(
        <TestProviders store={storeShowIsTrue}>
          <Flyout {...props} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="flyout-button-not-ready-to-drop"]').exists()).toEqual(
        false
      );
    });

    test('should call the onOpen when the mouse is clicked for rendering', () => {
      const wrapper = mount(
        <TestProviders>
          <Flyout {...props} />
        </TestProviders>
      );

      wrapper.find('[data-test-subj="flyoutOverlay"]').first().simulate('click');

      expect(mockDispatch).toBeCalledWith(timelineActions.showTimeline({ id: 'test', show: true }));
    });
  });
});
