/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../../../common/mock/test_providers';
import { DroppableWrapper } from '../../../../common/components/drag_and_drop/droppable_wrapper';

import { timelineActions } from '../../../store/timeline';
import { mockDataProviders } from './mock/mock_data_providers';
import { Providers } from './providers';
import { DELETE_CLASS_NAME, ENABLE_CLASS_NAME, EXCLUDE_CLASS_NAME } from './provider_item_actions';
import { useMountAppended } from '../../../../common/utils/use_mount_appended';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { TimelineId } from '../../../../../common/types';

jest.mock('../../../../common/lib/kibana');

jest.mock('../../../../common/hooks/use_selector', () => ({
  useShallowEqualSelector: jest.fn(),
  useDeepEqualSelector: jest.fn(),
}));

describe('Providers', () => {
  const mount = useMountAppended();
  const mockOnDataProviderRemoved = jest.spyOn(timelineActions, 'removeProvider');

  beforeEach(() => {
    jest.clearAllMocks();
    (useDeepEqualSelector as jest.Mock).mockReturnValue({ isLoading: false });
  });

  describe('rendering', () => {
    test('renders correctly against snapshot', () => {
      const wrapper = shallow(
        <Providers
          browserFields={{}}
          dataProviders={mockDataProviders}
          timelineId={TimelineId.test}
        />
      );
      expect(wrapper).toMatchSnapshot();
    });

    test('it renders the data providers', () => {
      const wrapper = mount(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={mockDataProviders}
              timelineId={TimelineId.test}
            />
          </DroppableWrapper>
        </TestProviders>
      );

      mockDataProviders.forEach((dataProvider) =>
        expect(wrapper.text()).toContain(
          dataProvider.queryMatch.displayValue || dataProvider.queryMatch.value
        )
      );
    });
  });

  describe('#onDataProviderRemoved', () => {
    test('it invokes the onDataProviderRemoved callback when the close button is clicked', () => {
      const wrapper = mount(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={mockDataProviders}
              timelineId={TimelineId.test}
            />
          </DroppableWrapper>
        </TestProviders>
      );
      wrapper
        .find('[data-test-subj="providerBadge"] [data-euiicon-type]')
        .first()
        .simulate('click');
      expect(mockOnDataProviderRemoved.mock.calls[0][0].providerId).toEqual('id-Provider 1');
    });

    test('while loading data, it does NOT invoke the onDataProviderRemoved callback when the close button is clicked', () => {
      (useDeepEqualSelector as jest.Mock).mockReturnValue({ isLoading: true });
      const wrapper = mount(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={mockDataProviders}
              timelineId={TimelineId.test}
            />
          </DroppableWrapper>
        </TestProviders>
      );

      wrapper
        .find('[data-test-subj="providerBadge"] [data-euiicon-type]')
        .first()
        .simulate('click');

      expect(mockOnDataProviderRemoved).not.toBeCalled();
    });

    test('it invokes the onDataProviderRemoved callback when you click on the option "Delete" in the provider menu', () => {
      const wrapper = mount(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={mockDataProviders}
              timelineId={TimelineId.test}
            />
          </DroppableWrapper>
        </TestProviders>
      );
      wrapper.find('button[data-test-subj="providerBadge"]').first().simulate('click');

      wrapper.update();

      wrapper
        .find(`[data-test-subj="providerActions"] .${DELETE_CLASS_NAME}`)
        .first()
        .simulate('click');
      expect(mockOnDataProviderRemoved.mock.calls[0][0].providerId).toEqual('id-Provider 1');
    });

    test('while loading data, it does NOT invoke the onDataProviderRemoved callback when you click on the option "Delete" in the provider menu', () => {
      (useDeepEqualSelector as jest.Mock).mockReturnValue({ isLoading: true });
      const wrapper = mount(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={mockDataProviders}
              timelineId={TimelineId.test}
            />
          </DroppableWrapper>
        </TestProviders>
      );
      wrapper.find('button[data-test-subj="providerBadge"]').first().simulate('click');

      wrapper.update();

      wrapper
        .find(`[data-test-subj="providerActions"] .${DELETE_CLASS_NAME}`)
        .first()
        .simulate('click');

      expect(mockOnDataProviderRemoved).not.toBeCalled();
    });
  });

  describe('#onToggleDataProviderEnabled', () => {
    test('it invokes the onToggleDataProviderEnabled callback when you click on the option "Temporary disable" in the provider menu', () => {
      const mockOnToggleDataProviderEnabled = jest.spyOn(
        timelineActions,
        'updateDataProviderEnabled'
      );
      const wrapper = mount(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={mockDataProviders}
              timelineId={TimelineId.test}
            />
          </DroppableWrapper>
        </TestProviders>
      );

      wrapper.find('button[data-test-subj="providerBadge"]').first().simulate('click');
      wrapper.update();

      wrapper
        .find(`[data-test-subj="providerActions"] .${ENABLE_CLASS_NAME}`)
        .first()
        .simulate('click');
      expect(mockOnToggleDataProviderEnabled.mock.calls[0][0]).toEqual({
        andProviderId: undefined,
        enabled: false,
        id: 'timeline-test',
        providerId: 'id-Provider 1',
      });
    });

    test('while loading data, it does NOT invoke the onToggleDataProviderEnabled callback when you click on the option "Temporary disable" in the provider menu', () => {
      (useDeepEqualSelector as jest.Mock).mockReturnValue({ isLoading: true });
      const mockOnToggleDataProviderEnabled = jest.spyOn(
        timelineActions,
        'updateDataProviderEnabled'
      );
      const wrapper = mount(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={mockDataProviders}
              timelineId={TimelineId.test}
            />
          </DroppableWrapper>
        </TestProviders>
      );

      wrapper.find('button[data-test-subj="providerBadge"]').first().simulate('click');
      wrapper.update();

      wrapper
        .find(`[data-test-subj="providerActions"] .${ENABLE_CLASS_NAME}`)
        .first()
        .simulate('click');

      expect(mockOnToggleDataProviderEnabled).not.toBeCalled();
    });
  });

  describe('#onToggleDataProviderExcluded', () => {
    test('it invokes the onToggleDataProviderExcluded callback when you click on the option "Exclude results" in the provider menu', () => {
      const mockOnToggleDataProviderExcluded = jest.spyOn(
        timelineActions,
        'updateDataProviderExcluded'
      );

      const wrapper = mount(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={mockDataProviders}
              timelineId={TimelineId.test}
            />
          </DroppableWrapper>
        </TestProviders>
      );

      wrapper.find('button[data-test-subj="providerBadge"]').first().simulate('click');

      wrapper.update();

      wrapper
        .find(`[data-test-subj="providerActions"] .${EXCLUDE_CLASS_NAME}`)
        .first()
        .simulate('click');

      expect(mockOnToggleDataProviderExcluded.mock.calls[0][0]).toEqual({
        andProviderId: undefined,
        excluded: true,
        id: 'timeline-test',
        providerId: 'id-Provider 1',
      });
    });

    test('while loading data, it does NOT invoke the onToggleDataProviderExcluded callback when you click on the option "Exclude results" in the provider menu', () => {
      (useDeepEqualSelector as jest.Mock).mockReturnValue({ isLoading: true });
      const mockOnToggleDataProviderExcluded = jest.spyOn(
        timelineActions,
        'updateDataProviderExcluded'
      );

      const wrapper = mount(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={mockDataProviders}
              timelineId={TimelineId.test}
            />
          </DroppableWrapper>
        </TestProviders>
      );

      wrapper.find('button[data-test-subj="providerBadge"]').first().simulate('click');

      wrapper.update();

      wrapper
        .find(`[data-test-subj="providerActions"] .${EXCLUDE_CLASS_NAME}`)
        .first()
        .simulate('click');

      expect(mockOnToggleDataProviderExcluded).not.toBeCalled();
    });
  });

  describe('#ProviderWithAndProvider', () => {
    test('Rendering And Provider', () => {
      const dataProviders = mockDataProviders.slice(0, 1);
      dataProviders[0].and = mockDataProviders.slice(1, 3);

      const wrapper = mount(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={dataProviders}
              timelineId={TimelineId.test}
            />
          </DroppableWrapper>
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

    test('it invokes the onDataProviderRemoved callback when you click on the close button is clicked', () => {
      const dataProviders = mockDataProviders.slice(0, 1);
      dataProviders[0].and = mockDataProviders.slice(1, 3);

      const wrapper = mount(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={mockDataProviders}
              timelineId={TimelineId.test}
            />
          </DroppableWrapper>
        </TestProviders>
      );

      wrapper
        .find('[data-test-subj="providerBadge"]')
        .at(4)
        .find('[data-euiicon-type]')
        .first()
        .simulate('click');

      wrapper.update();

      expect(mockOnDataProviderRemoved.mock.calls[0][0]).toEqual({
        andProviderId: 'id-Provider 2',
        id: 'timeline-test',
        providerId: 'id-Provider 1',
      });
    });

    test('while loading data, it does NOT invoke the onDataProviderRemoved callback when you click on the close button is clicked', () => {
      (useDeepEqualSelector as jest.Mock).mockReturnValue({ isLoading: true });
      const dataProviders = mockDataProviders.slice(0, 1);
      dataProviders[0].and = mockDataProviders.slice(1, 3);

      const wrapper = mount(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={mockDataProviders}
              timelineId={TimelineId.test}
            />
          </DroppableWrapper>
        </TestProviders>
      );

      wrapper
        .find('[data-test-subj="providerBadge"]')
        .at(4)
        .find('[data-euiicon-type]')
        .first()
        .simulate('click');

      wrapper.update();

      expect(mockOnDataProviderRemoved).not.toBeCalled();
    });

    test('it invokes the onToggleDataProviderEnabled callback when you click on the option "Temporary disable" in the provider menu', () => {
      const dataProviders = mockDataProviders.slice(0, 1);
      dataProviders[0].and = mockDataProviders.slice(1, 3);
      const mockOnToggleDataProviderEnabled = jest.spyOn(
        timelineActions,
        'updateDataProviderEnabled'
      );

      const wrapper = mount(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={dataProviders}
              timelineId={TimelineId.test}
            />
          </DroppableWrapper>
        </TestProviders>
      );

      wrapper
        .find('[data-test-subj="providerBadge"]')
        .at(4)
        .find('button')
        .first()
        .simulate('click');

      wrapper.update();

      wrapper
        .find(`[data-test-subj="providerActions"] .${ENABLE_CLASS_NAME}`)
        .first()
        .simulate('click');

      expect(mockOnToggleDataProviderEnabled.mock.calls[0][0]).toEqual({
        andProviderId: 'id-Provider 2',
        enabled: false,
        id: 'timeline-test',
        providerId: 'id-Provider 1',
      });
    });

    test('while loading data, it does NOT invoke the onToggleDataProviderEnabled callback when you click on the option "Temporary disable" in the provider menu', () => {
      (useDeepEqualSelector as jest.Mock).mockReturnValue({ isLoading: true });
      const dataProviders = mockDataProviders.slice(0, 1);
      dataProviders[0].and = mockDataProviders.slice(1, 3);
      const mockOnToggleDataProviderEnabled = jest.spyOn(
        timelineActions,
        'updateDataProviderEnabled'
      );

      const wrapper = mount(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={dataProviders}
              timelineId={TimelineId.test}
            />
          </DroppableWrapper>
        </TestProviders>
      );

      wrapper
        .find('[data-test-subj="providerBadge"]')
        .at(4)
        .find('button')
        .first()
        .simulate('click');

      wrapper.update();

      wrapper
        .find(`[data-test-subj="providerActions"] .${ENABLE_CLASS_NAME}`)
        .first()
        .simulate('click');

      expect(mockOnToggleDataProviderEnabled).not.toBeCalled();
    });

    test('it invokes the onToggleDataProviderExcluded callback when you click on the option "Exclude results" in the provider menu', () => {
      const dataProviders = mockDataProviders.slice(0, 1);
      dataProviders[0].and = mockDataProviders.slice(1, 3);
      const mockOnToggleDataProviderExcluded = jest.spyOn(
        timelineActions,
        'updateDataProviderExcluded'
      );

      const wrapper = mount(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={dataProviders}
              timelineId={TimelineId.test}
            />
          </DroppableWrapper>
        </TestProviders>
      );

      wrapper
        .find('[data-test-subj="providerBadge"]')
        .at(4)
        .find('button')
        .first()
        .simulate('click');

      wrapper.update();

      wrapper
        .find(`[data-test-subj="providerActions"] .${EXCLUDE_CLASS_NAME}`)
        .first()
        .simulate('click');

      expect(mockOnToggleDataProviderExcluded.mock.calls[0][0]).toEqual({
        andProviderId: 'id-Provider 2',
        excluded: true,
        id: 'timeline-test',
        providerId: 'id-Provider 1',
      });
    });

    test('while loading data, it does NOT invoke the onToggleDataProviderExcluded callback when you click on the option "Exclude results" in the provider menu', () => {
      (useDeepEqualSelector as jest.Mock).mockReturnValue({ isLoading: true });
      const dataProviders = mockDataProviders.slice(0, 1);
      dataProviders[0].and = mockDataProviders.slice(1, 3);
      const mockOnToggleDataProviderExcluded = jest.spyOn(
        timelineActions,
        'updateDataProviderExcluded'
      );

      const wrapper = mount(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={dataProviders}
              timelineId={TimelineId.test}
            />
          </DroppableWrapper>
        </TestProviders>
      );

      wrapper
        .find('[data-test-subj="providerBadge"]')
        .at(4)
        .find('button')
        .first()
        .simulate('click');

      wrapper.update();

      wrapper
        .find(`[data-test-subj="providerActions"] .${EXCLUDE_CLASS_NAME}`)
        .first()
        .simulate('click');

      expect(mockOnToggleDataProviderExcluded).not.toBeCalled();
    });
  });
});
