/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { mount, ReactWrapper } from 'enzyme';
import React from 'react';
import { Provider as ReduxStoreProvider } from 'react-redux';

import {
  mockGlobalState,
  apolloClientObservable,
  SUB_PLUGINS_REDUCER,
} from '../../../../common/mock';
import { createStore, State } from '../../../../common/store';
import { useKibana } from '../../../../common/lib/kibana';
import { TimelineType } from '../../../../../common/types/timeline';
import { CreateTimelineBtn } from './create_timeline_btn';

jest.mock('../../../../common/lib/kibana', () => {
  return {
    useKibana: jest.fn(),
  };
});

describe('CreateTimelineBtn', () => {
  const state: State = mockGlobalState;
  const store = createStore(state, SUB_PLUGINS_REDUCER, apolloClientObservable);
  const mockClosePopover = jest.fn();
  const mockTitle = 'NEW_TIMELINE';
  let wrapper: ReactWrapper;

  describe('render if CRUD', () => {
    beforeAll(() => {
      (useKibana as jest.Mock).mockReturnValue({
        services: {
          application: {
            capabilities: {
              siem: {
                crud: true,
              },
            },
          },
        },
      });

      afterAll(() => {
        (useKibana as jest.Mock).mockReset();
      });

      wrapper = mount(
        <ReduxStoreProvider store={store}>
          <CreateTimelineBtn
            onClosePopover={mockClosePopover}
            timelineType={TimelineType.default}
            title={mockTitle}
          />
        </ReduxStoreProvider>
      );
    });

    test('render with onClosePopover', () => {
      expect(wrapper.find('[data-test-subj="new-timeline-btn"]').prop('onClosePopover')).toEqual(
        mockClosePopover
      );
    });

    test('render with showTimeline', () => {
      expect(wrapper.find('[data-test-subj="new-timeline-btn"]').prop('showTimeline')).toBeTruthy();
    });

    test('render with createTimeline', () => {
      expect(
        wrapper.find('[data-test-subj="new-timeline-btn"]').prop('createTimeline')
      ).toBeTruthy();
    });

    test('render with default timelineId', () => {
      expect(wrapper.find('[data-test-subj="new-timeline-btn"]').prop('timelineId')).toEqual(
        'timeline-1'
      );
    });

    test('render with timelineType', () => {
      expect(wrapper.find('[data-test-subj="new-timeline-btn"]').prop('timelineType')).toEqual(
        TimelineType.default
      );
    });

    test('render with title', () => {
      expect(wrapper.find('[data-test-subj="new-timeline-btn"]').prop('title')).toEqual(mockTitle);
    });
  });

  describe('If no CRUD', () => {
    beforeAll(() => {
      (useKibana as jest.Mock).mockReturnValue({
        services: {
          application: {
            capabilities: {
              siem: {
                crud: false,
              },
            },
          },
        },
      });

      wrapper = mount(
        <ReduxStoreProvider store={store}>
          <CreateTimelineBtn
            onClosePopover={mockClosePopover}
            timelineType={TimelineType.default}
            title={mockTitle}
          />
        </ReduxStoreProvider>
      );
    });

    afterAll(() => {
      (useKibana as jest.Mock).mockReset();
    });

    test('no render', () => {
      expect(wrapper.find('[data-test-subj="new-timeline-btn"]').exists()).not.toBeTruthy();
    });
  });
});
