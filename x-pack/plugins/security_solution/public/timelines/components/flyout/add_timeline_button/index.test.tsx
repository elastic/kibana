/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount, ReactWrapper } from 'enzyme';
import React from 'react';
import { waitFor } from '@testing-library/react';

import { AddTimelineButton } from '.';
import { useKibana } from '../../../../common/lib/kibana';
import { TimelineId } from '../../../../../common/types/timeline';
import {
  mockIndexPattern,
  mockOpenTimelineQueryResults,
  TestProviders,
} from '../../../../common/mock';
import { getAllTimeline, useGetAllTimeline } from '../../../containers/all';
import { mockHistory, Router } from '../../../../common/mock/router';

jest.mock('../../open_timeline/use_timeline_status', () => {
  const originalModule = jest.requireActual('../../open_timeline/use_timeline_status');
  return {
    ...originalModule,
    useTimelineStatus: jest.fn().mockReturnValue({
      timelineStatus: 'active',
      templateTimelineFilter: [],
      installPrepackagedTimelines: jest.fn(),
    }),
  };
});

jest.mock('../../../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...originalModule,
    useKibana: jest.fn(),
    useUiSetting$: jest.fn().mockReturnValue([]),
  };
});

jest.mock('../../../containers/all', () => {
  const originalModule = jest.requireActual('../../../containers/all');
  return {
    ...originalModule,
    useGetAllTimeline: jest.fn(),
  };
});

jest.mock('../../timeline/properties/new_template_timeline', () => ({
  NewTemplateTimeline: jest.fn(() => <div data-test-subj="create-template-btn" />),
}));

jest.mock('../../timeline/properties/helpers', () => ({
  Description: jest.fn().mockReturnValue(<div data-test-subj="Description" />),
  ExistingCase: jest.fn().mockReturnValue(<div data-test-subj="ExistingCase" />),
  NewCase: jest.fn().mockReturnValue(<div data-test-subj="NewCase" />),
  NewTimeline: jest.fn().mockReturnValue(<div data-test-subj="create-default-btn" />),
  NotesButton: jest.fn().mockReturnValue(<div data-test-subj="NotesButton" />),
}));

jest.mock('../../../../common/components/inspect', () => ({
  InspectButton: jest.fn().mockReturnValue(<div />),
  InspectButtonContainer: jest.fn(({ children }) => <div>{children}</div>),
}));

jest.mock('../../../../common/containers/source', () => ({
  useFetchIndex: () => [false, { indicesExist: true, indexPatterns: mockIndexPattern }],
}));

describe('AddTimelineButton', () => {
  let wrapper: ReactWrapper;
  const props = {
    timelineId: TimelineId.active,
  };

  describe('with crud', () => {
    beforeEach(() => {
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
      wrapper = mount(<AddTimelineButton {...props} />);
    });

    afterEach(() => {
      (useKibana as jest.Mock).mockReset();
    });

    test('it renders settings-plus-in-circle', () => {
      expect(wrapper.find('[data-test-subj="settings-plus-in-circle"]').exists()).toBeTruthy();
    });

    test('it renders create timeline btn', async () => {
      wrapper.find('[data-test-subj="settings-plus-in-circle"]').last().simulate('click');
      await waitFor(() =>
        expect(wrapper.find('[data-test-subj="create-default-btn"]').exists()).toBeTruthy()
      );
    });

    test('it renders create timeline template btn', async () => {
      wrapper.find('[data-test-subj="settings-plus-in-circle"]').last().simulate('click');
      await waitFor(() =>
        expect(wrapper.find('[data-test-subj="create-template-btn"]').exists()).toBeTruthy()
      );
    });

    test('it renders Open timeline btn', async () => {
      wrapper.find('[data-test-subj="settings-plus-in-circle"]').last().simulate('click');
      await waitFor(() =>
        expect(wrapper.find('[data-test-subj="open-timeline-button"]').exists()).toBeTruthy()
      );
    });
  });

  describe('with no crud', () => {
    beforeEach(async () => {
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
      wrapper = mount(<AddTimelineButton {...props} />);
    });

    afterEach(() => {
      (useKibana as jest.Mock).mockReset();
    });

    test('it renders settings-plus-in-circle', () => {
      expect(wrapper.find('[data-test-subj="settings-plus-in-circle"]').exists()).toBeTruthy();
    });

    test('it renders create timeline btn', async () => {
      wrapper.find('[data-test-subj="settings-plus-in-circle"]').last().simulate('click');
      await waitFor(() =>
        expect(wrapper.find('[data-test-subj="create-default-btn"]').exists()).toBeTruthy()
      );
    });

    test('it renders create timeline template btn', async () => {
      wrapper.find('[data-test-subj="settings-plus-in-circle"]').last().simulate('click');
      await waitFor(() =>
        expect(wrapper.find('[data-test-subj="create-template-btn"]').exists()).toBeTruthy()
      );
    });

    test('it renders Open timeline btn', async () => {
      wrapper.find('[data-test-subj="settings-plus-in-circle"]').last().simulate('click');
      await waitFor(() =>
        expect(wrapper.find('[data-test-subj="open-timeline-button"]').exists()).toBeTruthy()
      );
    });
  });

  describe('open modal', () => {
    beforeEach(() => {
      (useKibana as jest.Mock).mockReturnValue({
        services: {
          application: {
            getUrlForApp: jest.fn(),
            capabilities: {
              siem: {
                crud: true,
              },
            },
          },
        },
      });

      (useGetAllTimeline as unknown as jest.Mock).mockReturnValue({
        fetchAllTimeline: jest.fn(),
        timelines: getAllTimeline('', mockOpenTimelineQueryResults.timeline ?? []),
        loading: false,
        totalCount: mockOpenTimelineQueryResults.totalCount,
        refetch: jest.fn(),
      });

      wrapper = mount(
        <TestProviders>
          <Router history={mockHistory}>
            <AddTimelineButton {...props} />
          </Router>
        </TestProviders>
      );
    });

    afterEach(() => {
      (useKibana as jest.Mock).mockReset();
    });

    it('should render timelines table', async () => {
      wrapper.find('[data-test-subj="settings-plus-in-circle"]').last().simulate('click');
      await waitFor(() => {
        expect(wrapper.find('[data-test-subj="open-timeline-button"]').exists()).toBeTruthy();
      });

      wrapper.find('[data-test-subj="open-timeline-button"]').first().simulate('click');
      await waitFor(() => {
        expect(wrapper.find('[data-test-subj="timelines-table"]').exists()).toBeTruthy();
      });
    });

    it('should render correct actions', async () => {
      wrapper.find('[data-test-subj="settings-plus-in-circle"]').last().simulate('click');
      await waitFor(() =>
        expect(wrapper.find('[data-test-subj="open-timeline-button"]').exists()).toBeTruthy()
      );

      wrapper.find('[data-test-subj="open-timeline-button"]').first().simulate('click');
      await waitFor(() => {
        expect(wrapper.find('[data-test-subj="open-duplicate"]').exists()).toBeTruthy();
        expect(wrapper.find('[data-test-subj="create-from-template"]').exists()).toBeFalsy();
      });
    });
  });
});
