/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';
import useResizeObserver from 'use-resize-observer/polyfilled';

import { timelineQuery } from '../../containers/index.gql_query';
import { mockBrowserFields } from '../../../common/containers/source/mock';
import { Direction } from '../../../graphql/types';
import { defaultHeaders, mockTimelineData, mockIndexPattern } from '../../../common/mock';
import '../../../common/mock/match_media';
import { TestProviders } from '../../../common/mock/test_providers';

import {
  DELETE_CLASS_NAME,
  ENABLE_CLASS_NAME,
  EXCLUDE_CLASS_NAME,
} from './data_providers/provider_item_actions';
import { TimelineComponent, Props as TimelineComponentProps } from './timeline';
import { Sort } from './body/sort';
import { mockDataProviders } from './data_providers/mock/mock_data_providers';
import { useMountAppended } from '../../../common/utils/use_mount_appended';
import { TimelineStatus, TimelineType } from '../../../../common/types/timeline';

jest.mock('../../../common/lib/kibana');
jest.mock('./properties/properties_right');
const mockUseResizeObserver: jest.Mock = useResizeObserver as jest.Mock;
jest.mock('use-resize-observer/polyfilled');

mockUseResizeObserver.mockImplementation(() => ({}));

jest.mock('../../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../../common/lib/kibana');
  return {
    ...originalModule,
    useKibana: jest.fn().mockReturnValue({
      services: {
        application: {
          navigateToApp: jest.fn(),
        },
        uiSettings: {
          get: jest.fn(),
        },
        savedObjects: {
          client: {},
        },
      },
    }),
    useGetUserSavedObjectPermissions: jest.fn(),
  };
});
describe('Timeline', () => {
  let props = {} as TimelineComponentProps;
  const sort: Sort = {
    columnId: '@timestamp',
    sortDirection: Direction.desc,
  };
  const startDate = '2018-03-23T18:49:23.132Z';
  const endDate = '2018-03-24T03:33:52.253Z';

  const indexPattern = mockIndexPattern;

  const mocks = [
    { request: { query: timelineQuery }, result: { data: { events: mockTimelineData } } },
  ];

  const mount = useMountAppended();

  beforeEach(() => {
    props = {
      browserFields: mockBrowserFields,
      columns: defaultHeaders,
      id: 'foo',
      dataProviders: mockDataProviders,
      docValueFields: [],
      end: endDate,
      eventType: 'raw' as TimelineComponentProps['eventType'],
      filters: [],
      indexPattern,
      indexToAdd: [],
      isLive: false,
      isLoadingSource: false,
      isSaving: false,
      itemsPerPage: 5,
      itemsPerPageOptions: [5, 10, 20],
      kqlMode: 'search' as TimelineComponentProps['kqlMode'],
      kqlQueryExpression: '',
      loadingIndexName: false,
      onChangeItemsPerPage: jest.fn(),
      onClose: jest.fn(),
      onDataProviderEdited: jest.fn(),
      onDataProviderRemoved: jest.fn(),
      onToggleDataProviderEnabled: jest.fn(),
      onToggleDataProviderExcluded: jest.fn(),
      onToggleDataProviderType: jest.fn(),
      show: true,
      showCallOutUnauthorizedMsg: false,
      start: startDate,
      sort,
      status: TimelineStatus.active,
      toggleColumn: jest.fn(),
      usersViewing: ['elastic'],
      timelineType: TimelineType.default,
    };
  });

  describe('rendering', () => {
    test('renders correctly against snapshot', () => {
      const wrapper = shallow(
        <TestProviders>
          <TimelineComponent {...props} />
        </TestProviders>
      );

      expect(wrapper).toMatchSnapshot();
    });

    test('it renders the timeline header', () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mocks}>
            <TimelineComponent {...props} />
          </MockedProvider>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="timelineHeader"]').exists()).toEqual(true);
    });

    test('it renders the title field', () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mocks}>
            <TimelineComponent {...props} />
          </MockedProvider>
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="timeline-title"]').first().props().placeholder
      ).toContain('Untitled timeline');
    });

    test('it renders the timeline table', () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mocks}>
            <TimelineComponent {...props} />
          </MockedProvider>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="events-table"]').exists()).toEqual(true);
    });

    test('it does NOT render the timeline table when the source is loading', () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mocks}>
            <TimelineComponent {...props} isLoadingSource={true} />
          </MockedProvider>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="events-table"]').exists()).toEqual(false);
    });

    test('it does NOT render the timeline table when start is empty', () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mocks}>
            <TimelineComponent {...props} start={''} />
          </MockedProvider>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="events-table"]').exists()).toEqual(false);
    });

    test('it does NOT render the timeline table when end is empty', () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mocks}>
            <TimelineComponent {...props} end={''} />
          </MockedProvider>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="events-table"]').exists()).toEqual(false);
    });

    test('it does NOT render the paging footer when you do NOT have any data providers', () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mocks}>
            <TimelineComponent {...props} />
          </MockedProvider>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="table-pagination"]').exists()).toEqual(false);
    });

    test('it defaults to showing `All`', () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mocks}>
            <TimelineComponent {...props} />
          </MockedProvider>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="pick-event-type"] button').text()).toEqual('All');
    });

    it('it shows the timeline footer', () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mocks}>
            <TimelineComponent {...props} />
          </MockedProvider>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="timeline-footer"]').exists()).toEqual(true);
    });
    describe('when there is a graphEventId', () => {
      beforeEach(() => {
        props.graphEventId = 'graphEventId'; // any string w/ length > 0 works
      });
      it('should not show the timeline footer', () => {
        const wrapper = mount(
          <TestProviders>
            <MockedProvider mocks={mocks}>
              <TimelineComponent {...props} />
            </MockedProvider>
          </TestProviders>
        );

        expect(wrapper.find('[data-test-subj="timeline-footer"]').exists()).toEqual(false);
      });
    });
  });

  describe('event wire up', () => {
    describe('onDataProviderRemoved', () => {
      test('it invokes the onDataProviderRemoved callback when the delete button on a provider is clicked', () => {
        const wrapper = mount(
          <TestProviders>
            <MockedProvider mocks={mocks}>
              <TimelineComponent {...props} />
            </MockedProvider>
          </TestProviders>
        );

        wrapper
          .find('[data-test-subj="providerBadge"] [data-euiicon-type]')
          .first()
          .simulate('click');

        expect((props.onDataProviderRemoved as jest.Mock).mock.calls[0][0]).toEqual(
          'id-Provider 1'
        );
      });

      test('it invokes the onDataProviderRemoved callback when you click on the option "Delete" in the provider menu', () => {
        const wrapper = mount(
          <TestProviders>
            <MockedProvider mocks={mocks}>
              <TimelineComponent {...props} />
            </MockedProvider>
          </TestProviders>
        );
        wrapper.find('button[data-test-subj="providerBadge"]').first().simulate('click');

        wrapper.update();

        wrapper
          .find(`[data-test-subj="providerActions"] .${DELETE_CLASS_NAME}`)
          .first()
          .simulate('click');

        expect((props.onDataProviderRemoved as jest.Mock).mock.calls[0][0]).toEqual(
          'id-Provider 1'
        );
      });
    });

    describe('onToggleDataProviderEnabled', () => {
      test('it invokes the onToggleDataProviderEnabled callback when you click on the option "Temporary disable" in the provider menu', () => {
        const wrapper = mount(
          <TestProviders>
            <MockedProvider mocks={mocks}>
              <TimelineComponent {...props} />
            </MockedProvider>
          </TestProviders>
        );

        wrapper.find('button[data-test-subj="providerBadge"]').first().simulate('click');

        wrapper.update();

        wrapper
          .find(`[data-test-subj="providerActions"] .${ENABLE_CLASS_NAME}`)
          .first()
          .simulate('click');

        expect((props.onToggleDataProviderEnabled as jest.Mock).mock.calls[0][0]).toEqual({
          providerId: 'id-Provider 1',
          enabled: false,
        });
      });
    });

    describe('onToggleDataProviderExcluded', () => {
      test('it invokes the onToggleDataProviderExcluded callback when you click on the option "Exclude results" in the provider menu', () => {
        const wrapper = mount(
          <TestProviders>
            <MockedProvider mocks={mocks}>
              <TimelineComponent {...props} />
            </MockedProvider>
          </TestProviders>
        );

        wrapper
          .find('[data-test-subj="providerBadge"]')
          .first()
          .find('button')
          .first()
          .simulate('click');

        wrapper.update();

        wrapper
          .find(`[data-test-subj="providerActions"] .${EXCLUDE_CLASS_NAME}`)
          .first()
          .simulate('click');

        expect((props.onToggleDataProviderExcluded as jest.Mock).mock.calls[0][0]).toEqual({
          providerId: 'id-Provider 1',
          excluded: true,
        });
      });
    });

    describe('#ProviderWithAndProvider', () => {
      const dataProviders = mockDataProviders.slice(0, 1);
      dataProviders[0].and = mockDataProviders.slice(1, 3);

      test('Rendering And Provider', () => {
        const wrapper = mount(
          <TestProviders>
            <MockedProvider mocks={mocks}>
              <TimelineComponent {...props} dataProviders={dataProviders} />
            </MockedProvider>
          </TestProviders>
        );

        const andProviderBadges = wrapper.find(
          '[data-test-subj="providerBadge"] .euiBadge__content span.field-value'
        );

        const andProviderBadgesText = andProviderBadges.map((node) => node.text()).join(' ');
        expect(andProviderBadges.length).toEqual(3);
        expect(andProviderBadgesText).toEqual(
          'name: "Provider 1" name: "Provider 2" name: "Provider 3"'
        );
      });

      test('it invokes the onDataProviderRemoved callback when you click on the option "Delete" in the accordion menu', () => {
        const wrapper = mount(
          <TestProviders>
            <MockedProvider mocks={mocks}>
              <TimelineComponent {...props} dataProviders={dataProviders} />
            </MockedProvider>
          </TestProviders>
        );

        wrapper
          .find('[data-test-subj="providerBadge"]')
          .at(3)
          .find('button')
          .first()
          .simulate('click');

        wrapper.update();

        wrapper
          .find(`[data-test-subj="providerActions"] .${DELETE_CLASS_NAME}`)
          .first()
          .simulate('click');

        expect((props.onDataProviderRemoved as jest.Mock).mock.calls[0]).toEqual([
          'id-Provider 1',
          'id-Provider 2',
        ]);
      });

      test('it invokes the onToggleDataProviderEnabled callback when you click on the option "Temporary disable" in the accordion menu', () => {
        const wrapper = mount(
          <TestProviders>
            <MockedProvider mocks={mocks}>
              <TimelineComponent {...props} dataProviders={dataProviders} />
            </MockedProvider>
          </TestProviders>
        );

        wrapper
          .find('[data-test-subj="providerBadge"]')
          .at(3)
          .find('button')
          .first()
          .simulate('click');

        wrapper.update();

        wrapper
          .find(`[data-test-subj="providerActions"] .${ENABLE_CLASS_NAME}`)
          .first()
          .simulate('click');

        expect((props.onToggleDataProviderEnabled as jest.Mock).mock.calls[0][0]).toEqual({
          andProviderId: 'id-Provider 2',
          enabled: false,
          providerId: 'id-Provider 1',
        });
      });

      test('it invokes the onToggleDataProviderExcluded callback when you click on the option "Exclude results" in the accordion menu', () => {
        const wrapper = mount(
          <TestProviders>
            <MockedProvider mocks={mocks}>
              <TimelineComponent {...props} dataProviders={dataProviders} />
            </MockedProvider>
          </TestProviders>
        );

        wrapper
          .find('[data-test-subj="providerBadge"]')
          .at(3)
          .find('button')
          .first()
          .simulate('click');

        wrapper.update();

        wrapper
          .find(`[data-test-subj="providerActions"] .${EXCLUDE_CLASS_NAME}`)
          .first()
          .simulate('click');

        expect((props.onToggleDataProviderExcluded as jest.Mock).mock.calls[0][0]).toEqual({
          andProviderId: 'id-Provider 2',
          excluded: true,
          providerId: 'id-Provider 1',
        });
      });
    });
  });
});
