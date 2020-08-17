/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { TimelineStatus, TimelineType } from '../../../../../common/types/timeline';
import {
  mockGlobalState,
  apolloClientObservable,
  SUB_PLUGINS_REDUCER,
  createSecuritySolutionStorageMock,
  TestProviders,
  kibanaObservable,
} from '../../../../common/mock';
import '../../../../common/mock/match_media';
import { createStore, State } from '../../../../common/store';
import { useThrottledResizeObserver } from '../../../../common/components/utils';
import { Properties, showDescriptionThreshold, showNotesThreshold } from '.';
import { setInsertTimeline } from '../../../store/timeline/actions';
export { nextTick } from '../../../../../../../test_utils';

import { act } from 'react-dom/test-utils';

jest.mock('../../../../common/components/link_to');

const mockNavigateToApp = jest.fn().mockImplementation(() => Promise.resolve());
jest.mock('../../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../../common/lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      services: {
        application: {
          capabilities: {
            siem: {
              crud: true,
            },
          },
          navigateToApp: mockNavigateToApp,
        },
      },
    }),
    useUiSetting$: jest.fn().mockReturnValue([]),
    useGetUserSavedObjectPermissions: jest.fn(),
  };
});

const mockDispatch = jest.fn();
jest.mock('../../../../common/components/utils', () => {
  return {
    useThrottledResizeObserver: jest.fn(),
  };
});

jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
    useSelector: jest.fn().mockReturnValue({ savedObjectId: '1', urlState: {} }),
  };
});

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useHistory: () => ({
      push: jest.fn(),
    }),
  };
});

jest.mock('./use_create_timeline', () => ({
  useCreateTimelineButton: jest.fn().mockReturnValue({ getButton: jest.fn() }),
}));
const usersViewing = ['elastic'];
const defaultProps = {
  associateNote: jest.fn(),
  createTimeline: jest.fn(),
  isDataInTimeline: false,
  isDatepickerLocked: false,
  isFavorite: false,
  title: '',
  timelineType: TimelineType.default,
  description: '',
  getNotesByIds: jest.fn(),
  noteIds: [],
  status: TimelineStatus.active,
  timelineId: 'abc',
  toggleLock: jest.fn(),
  updateDescription: jest.fn(),
  updateIsFavorite: jest.fn(),
  updateTitle: jest.fn(),
  updateNote: jest.fn(),
  usersViewing,
};
describe('Properties', () => {
  const state: State = mockGlobalState;
  const { storage } = createSecuritySolutionStorageMock();
  let mockedWidth = 1000;

  let store = createStore(
    state,
    SUB_PLUGINS_REDUCER,
    apolloClientObservable,
    kibanaObservable,
    storage
  );

  beforeEach(() => {
    jest.clearAllMocks();
    store = createStore(
      state,
      SUB_PLUGINS_REDUCER,
      apolloClientObservable,
      kibanaObservable,
      storage
    );
    (useThrottledResizeObserver as jest.Mock).mockReturnValue({ width: mockedWidth });
  });

  test('renders correctly', () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <Properties {...defaultProps} />
      </TestProviders>
    );

    wrapper.find('[data-test-subj="settings-gear"]').at(0).simulate('click');

    expect(wrapper.find('[data-test-subj="timeline-properties"]').exists()).toEqual(true);
    expect(wrapper.find('button[data-test-subj="attach-timeline-case"]').prop('disabled')).toEqual(
      false
    );
    expect(
      wrapper.find('button[data-test-subj="attach-timeline-existing-case"]').prop('disabled')
    ).toEqual(false);
  });

  test('renders correctly draft timeline', () => {
    const testProps = { ...defaultProps, status: TimelineStatus.draft };
    const wrapper = mount(
      <TestProviders store={store}>
        <Properties {...testProps} />
      </TestProviders>
    );

    wrapper.find('[data-test-subj="settings-gear"]').at(0).simulate('click');

    expect(wrapper.find('button[data-test-subj="attach-timeline-case"]').prop('disabled')).toEqual(
      true
    );
    expect(
      wrapper.find('button[data-test-subj="attach-timeline-existing-case"]').prop('disabled')
    ).toEqual(true);
  });

  test('it renders an empty star icon when it is NOT a favorite', () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <Properties {...defaultProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="timeline-favorite-empty-star"]').exists()).toEqual(true);
  });

  test('it renders a filled star icon when it is a favorite', () => {
    const testProps = { ...defaultProps, isFavorite: true };

    const wrapper = mount(
      <TestProviders store={store}>
        <Properties {...testProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="timeline-favorite-filled-star"]').exists()).toEqual(true);
  });

  test('it renders the title of the timeline', () => {
    const title = 'foozle';
    const testProps = { ...defaultProps, title };
    const wrapper = mount(
      <TestProviders store={store}>
        <Properties {...testProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="timeline-title"]').first().props().value).toEqual(title);
  });

  test('it renders the date picker with the lock icon', () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <Properties {...defaultProps} />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="properties-left"]')
        .find('[data-test-subj="timeline-date-picker-container"]')
        .exists()
    ).toEqual(true);
  });

  test('it renders the lock icon when isDatepickerLocked is true', () => {
    const testProps = { ...defaultProps, isDatepickerLocked: true };

    const wrapper = mount(
      <TestProviders store={store}>
        <Properties {...testProps} />
      </TestProviders>
    );
    expect(
      wrapper
        .find('[data-test-subj="properties-left"]')
        .find('[data-test-subj="timeline-date-picker-lock-button"]')
        .exists()
    ).toEqual(true);
  });

  test('it renders the unlock icon when isDatepickerLocked is false', () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <Properties {...defaultProps} />
      </TestProviders>
    );
    expect(
      wrapper
        .find('[data-test-subj="properties-left"]')
        .find('[data-test-subj="timeline-date-picker-unlock-button"]')
        .exists()
    ).toEqual(true);
  });

  test('it renders a description on the left when the width is at least as wide as the threshold', () => {
    const description = 'strange';
    const testProps = { ...defaultProps, description };

    // mockedWidth = showDescriptionThreshold;

    (useThrottledResizeObserver as jest.Mock).mockReset();
    (useThrottledResizeObserver as jest.Mock).mockReturnValue({ width: showDescriptionThreshold });

    const wrapper = mount(
      <TestProviders store={store}>
        <Properties {...testProps} />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="properties-left"]')
        .find('[data-test-subj="timeline-description"]')
        .first()
        .props().value
    ).toEqual(description);
  });

  test('it does NOT render a description on the left when the width is less than the threshold', () => {
    const description = 'strange';
    const testProps = { ...defaultProps, description };

    // mockedWidth = showDescriptionThreshold - 1;

    (useThrottledResizeObserver as jest.Mock).mockReset();
    (useThrottledResizeObserver as jest.Mock).mockReturnValue({
      width: showDescriptionThreshold - 1,
    });

    const wrapper = mount(
      <TestProviders store={store}>
        <Properties {...testProps} />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="properties-left"]')
        .find('[data-test-subj="timeline-description"]')
        .exists()
    ).toEqual(false);
  });

  test('it renders a notes button on the left when the width is at least as wide as the threshold', () => {
    mockedWidth = showNotesThreshold;

    const wrapper = mount(
      <TestProviders store={store}>
        <Properties {...defaultProps} />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="properties-left"]')
        .find('[data-test-subj="timeline-notes-button-large"]')
        .exists()
    ).toEqual(true);
  });

  test('it does NOT render a a notes button on the left when the width is less than the threshold', () => {
    (useThrottledResizeObserver as jest.Mock).mockReset();
    (useThrottledResizeObserver as jest.Mock).mockReturnValue({
      width: showNotesThreshold - 1,
    });

    const wrapper = mount(
      <TestProviders store={store}>
        <Properties {...defaultProps} />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="properties-left"]')
        .find('[data-test-subj="timeline-notes-button-large"]')
        .exists()
    ).toEqual(false);
  });

  test('it renders a settings icon', () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <Properties {...defaultProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="settings-gear"]').exists()).toEqual(true);
  });

  test('it renders an avatar for the current user viewing the timeline when it has a title', () => {
    const title = 'port scan';
    const testProps = { ...defaultProps, title };

    const wrapper = mount(
      <TestProviders store={store}>
        <Properties {...testProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="avatar"]').exists()).toEqual(true);
  });

  test('it does NOT render an avatar for the current user viewing the timeline when it does NOT have a title', () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <Properties {...defaultProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="avatar"]').exists()).toEqual(false);
  });

  test('insert timeline - new case', async () => {
    const testProps = { ...defaultProps, title: 'coolness' };

    const wrapper = mount(
      <TestProviders store={store}>
        <Properties {...testProps} />
      </TestProviders>
    );
    wrapper.find('[data-test-subj="settings-gear"]').at(0).simulate('click');
    wrapper.find('[data-test-subj="attach-timeline-case"]').first().simulate('click');

    await act(async () => {
      await Promise.resolve({});
    });

    expect(mockNavigateToApp).toBeCalledWith('securitySolution:case', { path: '/create' });
    expect(mockDispatch).toBeCalledWith(
      setInsertTimeline({
        timelineId: defaultProps.timelineId,
        timelineSavedObjectId: '1',
        timelineTitle: 'coolness',
      })
    );
  });

  test('insert timeline - existing case', async () => {
    const testProps = { ...defaultProps, title: 'coolness' };

    const wrapper = mount(
      <TestProviders store={store}>
        <Properties {...testProps} />
      </TestProviders>
    );
    wrapper.find('[data-test-subj="settings-gear"]').at(0).simulate('click');
    wrapper.find('[data-test-subj="attach-timeline-existing-case"]').first().simulate('click');

    await act(async () => {
      await Promise.resolve({});
    });
    expect(wrapper.find('[data-test-subj="all-cases-modal"]').exists()).toBeTruthy();
  });
});
