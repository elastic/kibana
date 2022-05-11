/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { waitFor } from '@testing-library/react';

import { AddToFavoritesButton, NewTimeline, NewTimelineProps } from './helpers';
import { useCreateTimelineButton } from './use_create_timeline';
import { kibanaObservable, TestProviders } from '../../../../common/mock/test_providers';
import { timelineActions } from '../../../store/timeline';
import { TimelineStatus, TimelineType } from '../../../../../common/types/timeline';
import {
  createSecuritySolutionStorageMock,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
} from '../../../../common/mock';
import { createStore } from '../../../../common/store';

jest.mock('./use_create_timeline');

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      application: {
        navigateToApp: () => Promise.resolve(),
        capabilities: {
          siem: {
            crud: true,
          },
        },
      },
    },
  }),
}));

describe('NewTimeline', () => {
  const mockGetButton = jest.fn();

  const props: NewTimelineProps = {
    closeGearMenu: jest.fn(),
    timelineId: 'mockTimelineId',
    title: 'mockTitle',
  };

  describe('render', () => {
    describe('default', () => {
      beforeAll(() => {
        (useCreateTimelineButton as jest.Mock).mockReturnValue({ getButton: mockGetButton });
        mount(<NewTimeline {...props} />);
      });

      afterAll(() => {
        jest.clearAllMocks();
      });

      test('it should not render outline', () => {
        expect(mockGetButton.mock.calls[0][0].outline).toEqual(false);
      });

      test('it should render title', () => {
        expect(mockGetButton.mock.calls[0][0].title).toEqual(props.title);
      });
    });

    describe('show outline', () => {
      beforeAll(() => {
        (useCreateTimelineButton as jest.Mock).mockReturnValue({ getButton: mockGetButton });

        const enableOutline = {
          ...props,
          outline: true,
        };
        mount(<NewTimeline {...enableOutline} />);
      });

      afterAll(() => {
        jest.clearAllMocks();
      });

      test('it should  render outline', () => {
        expect(mockGetButton.mock.calls[0][0].outline).toEqual(true);
      });

      test('it should render title', () => {
        expect(mockGetButton.mock.calls[0][0].title).toEqual(props.title);
      });
    });
  });
});

describe('Favorite Button', () => {
  describe('Non Elastic prebuilt templates', () => {
    test('should render favorite button', () => {
      const wrapper = mount(
        <TestProviders>
          <AddToFavoritesButton timelineId="test" />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="timeline-favorite-empty-star"]').exists()).toBeTruthy();
    });

    test('Favorite button should be enabled ', () => {
      const wrapper = mount(
        <TestProviders>
          <AddToFavoritesButton timelineId="test" />
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="timeline-favorite-empty-star"]').first().prop('disabled')
      ).toEqual(false);
    });

    test('Should update isFavorite after clicking on favorite button', async () => {
      const spy = jest.spyOn(timelineActions, 'updateIsFavorite');
      const wrapper = mount(
        <TestProviders>
          <AddToFavoritesButton timelineId="test" />
        </TestProviders>
      );

      waitFor(() => {
        wrapper.simulate('click');
        expect(spy).toHaveBeenCalled();
      });
    });

    test('should disable favorite button with filled star', () => {
      const { storage } = createSecuritySolutionStorageMock();

      const store = createStore(
        {
          ...mockGlobalState,
          timeline: {
            ...mockGlobalState.timeline,
            timelineById: {
              test: {
                ...mockGlobalState.timeline.timelineById.test,
                isFavorite: true,
              },
            },
          },
        },
        SUB_PLUGINS_REDUCER,
        kibanaObservable,
        storage
      );
      const wrapper = mount(
        <TestProviders store={store}>
          <AddToFavoritesButton timelineId="test" />
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="timeline-favorite-filled-star"]').exists()
      ).toBeTruthy();
    });
  });

  describe('Elast prebuilt templates', () => {
    test('should disable favorite button', () => {
      const { storage } = createSecuritySolutionStorageMock();

      const store = createStore(
        {
          ...mockGlobalState,
          timeline: {
            ...mockGlobalState.timeline,
            timelineById: {
              test: {
                ...mockGlobalState.timeline.timelineById.test,
                status: TimelineStatus.immutable,
                timelineType: TimelineType.template,
                templateTimelineId: 'mock-template-timeline-id',
                templateTimelineVersion: 1,
              },
            },
          },
        },
        SUB_PLUGINS_REDUCER,
        kibanaObservable,
        storage
      );
      const wrapper = mount(
        <TestProviders store={store}>
          <AddToFavoritesButton timelineId="test" />
        </TestProviders>
      );
      expect(
        wrapper.find('[data-test-subj="timeline-favorite-empty-star"]').first().prop('disabled')
      ).toEqual(true);
    });
  });

  describe('Custom templates', () => {
    test('should enable favorite button', () => {
      const { storage } = createSecuritySolutionStorageMock();

      const store = createStore(
        {
          ...mockGlobalState,
          timeline: {
            ...mockGlobalState.timeline,
            timelineById: {
              test: {
                ...mockGlobalState.timeline.timelineById.test,
                status: TimelineStatus.active,
                timelineType: TimelineType.template,
                templateTimelineId: 'mock-template-timeline-id',
                templateTimelineVersion: 1,
              },
            },
          },
        },
        SUB_PLUGINS_REDUCER,
        kibanaObservable,
        storage
      );
      const wrapper = mount(
        <TestProviders store={store}>
          <AddToFavoritesButton timelineId="test" />
        </TestProviders>
      );
      expect(
        wrapper.find('[data-test-subj="timeline-favorite-empty-star"]').first().prop('disabled')
      ).toEqual(false);
    });
  });
});
