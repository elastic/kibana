/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { coreMock } from '../../../../../../../../src/core/public/mocks';
import { TestProviders } from '../../../../common/mock/test_providers';
import { DroppableWrapper } from '../../../../common/components/drag_and_drop/droppable_wrapper';
import { FilterManager } from '../../../../../../../../src/plugins/data/public';

import { mockDataProviders } from './mock/mock_data_providers';
import { Providers } from './providers';
import { DELETE_CLASS_NAME, ENABLE_CLASS_NAME, EXCLUDE_CLASS_NAME } from './provider_item_actions';
import { useMountAppended } from '../../../../common/utils/use_mount_appended';
import { ManageGlobalTimeline, getTimelineDefaults } from '../../manage_timeline';

const mockUiSettingsForFilterManager = coreMock.createStart().uiSettings;

describe('Providers', () => {
  const isLoading: boolean = true;
  const mount = useMountAppended();
  const filterManager = new FilterManager(mockUiSettingsForFilterManager);

  const manageTimelineForTesting = {
    foo: {
      ...getTimelineDefaults('foo'),
      filterManager,
      isLoading,
    },
  };
  describe('rendering', () => {
    test('renders correctly against snapshot', () => {
      const wrapper = shallow(
        <Providers
          browserFields={{}}
          dataProviders={mockDataProviders}
          timelineId="foo"
          onDataProviderEdited={jest.fn()}
          onDataProviderRemoved={jest.fn()}
          onToggleDataProviderEnabled={jest.fn()}
          onToggleDataProviderExcluded={jest.fn()}
          onToggleDataProviderType={jest.fn()}
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
              timelineId="foo"
              onDataProviderEdited={jest.fn()}
              onDataProviderRemoved={jest.fn()}
              onToggleDataProviderEnabled={jest.fn()}
              onToggleDataProviderExcluded={jest.fn()}
              onToggleDataProviderType={jest.fn()}
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
      const mockOnDataProviderRemoved = jest.fn();
      const wrapper = mount(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={mockDataProviders}
              timelineId="foo"
              onDataProviderEdited={jest.fn()}
              onDataProviderRemoved={mockOnDataProviderRemoved}
              onToggleDataProviderEnabled={jest.fn()}
              onToggleDataProviderExcluded={jest.fn()}
              onToggleDataProviderType={jest.fn()}
            />
          </DroppableWrapper>
        </TestProviders>
      );
      wrapper
        .find('[data-test-subj="providerBadge"] [data-euiicon-type]')
        .first()
        .simulate('click');
      expect(mockOnDataProviderRemoved.mock.calls[0][0]).toEqual('id-Provider 1');
    });

    test('while loading data, it does NOT invoke the onDataProviderRemoved callback when the close button is clicked', () => {
      const mockOnDataProviderRemoved = jest.fn();
      const wrapper = mount(
        <TestProviders>
          <ManageGlobalTimeline manageTimelineForTesting={manageTimelineForTesting}>
            <DroppableWrapper droppableId="unitTest">
              <Providers
                browserFields={{}}
                dataProviders={mockDataProviders}
                timelineId="foo"
                onDataProviderEdited={jest.fn()}
                onDataProviderRemoved={mockOnDataProviderRemoved}
                onToggleDataProviderEnabled={jest.fn()}
                onToggleDataProviderExcluded={jest.fn()}
                onToggleDataProviderType={jest.fn()}
              />
            </DroppableWrapper>
          </ManageGlobalTimeline>
        </TestProviders>
      );

      wrapper
        .find('[data-test-subj="providerBadge"] [data-euiicon-type]')
        .first()
        .simulate('click');

      expect(mockOnDataProviderRemoved).not.toBeCalled();
    });

    test('it invokes the onDataProviderRemoved callback when you click on the option "Delete" in the provider menu', () => {
      const mockOnDataProviderRemoved = jest.fn();
      const wrapper = mount(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={mockDataProviders}
              timelineId="foo"
              onDataProviderEdited={jest.fn()}
              onDataProviderRemoved={mockOnDataProviderRemoved}
              onToggleDataProviderEnabled={jest.fn()}
              onToggleDataProviderExcluded={jest.fn()}
              onToggleDataProviderType={jest.fn()}
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
      expect(mockOnDataProviderRemoved.mock.calls[0][0]).toEqual('id-Provider 1');
    });

    test('while loading data, it does NOT invoke the onDataProviderRemoved callback when you click on the option "Delete" in the provider menu', () => {
      const mockOnDataProviderRemoved = jest.fn();
      const wrapper = mount(
        <TestProviders>
          <ManageGlobalTimeline manageTimelineForTesting={manageTimelineForTesting}>
            <DroppableWrapper droppableId="unitTest">
              <Providers
                browserFields={{}}
                dataProviders={mockDataProviders}
                timelineId="foo"
                onDataProviderEdited={jest.fn()}
                onDataProviderRemoved={mockOnDataProviderRemoved}
                onToggleDataProviderEnabled={jest.fn()}
                onToggleDataProviderExcluded={jest.fn()}
                onToggleDataProviderType={jest.fn()}
              />
            </DroppableWrapper>
          </ManageGlobalTimeline>
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
      const mockOnToggleDataProviderEnabled = jest.fn();
      const wrapper = mount(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={mockDataProviders}
              timelineId="foo"
              onDataProviderEdited={jest.fn()}
              onDataProviderRemoved={jest.fn()}
              onToggleDataProviderEnabled={mockOnToggleDataProviderEnabled}
              onToggleDataProviderExcluded={jest.fn()}
              onToggleDataProviderType={jest.fn()}
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
        enabled: false,
        providerId: 'id-Provider 1',
      });
    });

    test('while loading data, it does NOT invoke the onToggleDataProviderEnabled callback when you click on the option "Temporary disable" in the provider menu', () => {
      const mockOnToggleDataProviderEnabled = jest.fn();
      const wrapper = mount(
        <TestProviders>
          <ManageGlobalTimeline manageTimelineForTesting={manageTimelineForTesting}>
            <DroppableWrapper droppableId="unitTest">
              <Providers
                browserFields={{}}
                dataProviders={mockDataProviders}
                timelineId="foo"
                onDataProviderEdited={jest.fn()}
                onDataProviderRemoved={jest.fn()}
                onToggleDataProviderEnabled={mockOnToggleDataProviderEnabled}
                onToggleDataProviderExcluded={jest.fn()}
                onToggleDataProviderType={jest.fn()}
              />
            </DroppableWrapper>
          </ManageGlobalTimeline>
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
      const onToggleDataProviderExcluded = jest.fn();

      const wrapper = mount(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={mockDataProviders}
              timelineId="foo"
              onDataProviderEdited={jest.fn()}
              onDataProviderRemoved={jest.fn()}
              onToggleDataProviderEnabled={jest.fn()}
              onToggleDataProviderExcluded={onToggleDataProviderExcluded}
              onToggleDataProviderType={jest.fn()}
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

      expect(onToggleDataProviderExcluded.mock.calls[0][0]).toEqual({
        excluded: true,
        providerId: 'id-Provider 1',
      });
    });

    test('while loading data, it does NOT invoke the onToggleDataProviderExcluded callback when you click on the option "Exclude results" in the provider menu', () => {
      const onToggleDataProviderExcluded = jest.fn();

      const wrapper = mount(
        <TestProviders>
          <ManageGlobalTimeline manageTimelineForTesting={manageTimelineForTesting}>
            <DroppableWrapper droppableId="unitTest">
              <Providers
                browserFields={{}}
                dataProviders={mockDataProviders}
                timelineId="foo"
                onDataProviderEdited={jest.fn()}
                onDataProviderRemoved={jest.fn()}
                onToggleDataProviderEnabled={jest.fn()}
                onToggleDataProviderExcluded={onToggleDataProviderExcluded}
                onToggleDataProviderType={jest.fn()}
              />
            </DroppableWrapper>
          </ManageGlobalTimeline>
        </TestProviders>
      );

      wrapper.find('button[data-test-subj="providerBadge"]').first().simulate('click');

      wrapper.update();

      wrapper
        .find(`[data-test-subj="providerActions"] .${EXCLUDE_CLASS_NAME}`)
        .first()
        .simulate('click');

      expect(onToggleDataProviderExcluded).not.toBeCalled();
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
              timelineId="foo"
              onDataProviderEdited={jest.fn()}
              onDataProviderRemoved={jest.fn()}
              onToggleDataProviderEnabled={jest.fn()}
              onToggleDataProviderExcluded={jest.fn()}
              onToggleDataProviderType={jest.fn()}
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
      const mockOnDataProviderRemoved = jest.fn();

      const wrapper = mount(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={mockDataProviders}
              timelineId="foo"
              onDataProviderEdited={jest.fn()}
              onDataProviderRemoved={mockOnDataProviderRemoved}
              onToggleDataProviderEnabled={jest.fn()}
              onToggleDataProviderExcluded={jest.fn()}
              onToggleDataProviderType={jest.fn()}
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

      expect(mockOnDataProviderRemoved.mock.calls[0]).toEqual(['id-Provider 1', 'id-Provider 2']);
    });

    test('while loading data, it does NOT invoke the onDataProviderRemoved callback when you click on the close button is clicked', () => {
      const dataProviders = mockDataProviders.slice(0, 1);
      dataProviders[0].and = mockDataProviders.slice(1, 3);
      const mockOnDataProviderRemoved = jest.fn();

      const wrapper = mount(
        <TestProviders>
          <ManageGlobalTimeline manageTimelineForTesting={manageTimelineForTesting}>
            <DroppableWrapper droppableId="unitTest">
              <Providers
                browserFields={{}}
                dataProviders={mockDataProviders}
                timelineId="foo"
                onDataProviderEdited={jest.fn()}
                onDataProviderRemoved={mockOnDataProviderRemoved}
                onToggleDataProviderEnabled={jest.fn()}
                onToggleDataProviderExcluded={jest.fn()}
                onToggleDataProviderType={jest.fn()}
              />
            </DroppableWrapper>
          </ManageGlobalTimeline>
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
      const mockOnToggleDataProviderEnabled = jest.fn();

      const wrapper = mount(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={dataProviders}
              timelineId="foo"
              onDataProviderEdited={jest.fn()}
              onDataProviderRemoved={jest.fn()}
              onToggleDataProviderEnabled={mockOnToggleDataProviderEnabled}
              onToggleDataProviderExcluded={jest.fn()}
              onToggleDataProviderType={jest.fn()}
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
        providerId: 'id-Provider 1',
      });
    });

    test('while loading data, it does NOT invoke the onToggleDataProviderEnabled callback when you click on the option "Temporary disable" in the provider menu', () => {
      const dataProviders = mockDataProviders.slice(0, 1);
      dataProviders[0].and = mockDataProviders.slice(1, 3);
      const mockOnToggleDataProviderEnabled = jest.fn();

      const wrapper = mount(
        <TestProviders>
          <ManageGlobalTimeline manageTimelineForTesting={manageTimelineForTesting}>
            <DroppableWrapper droppableId="unitTest">
              <Providers
                browserFields={{}}
                dataProviders={dataProviders}
                timelineId="foo"
                onDataProviderEdited={jest.fn()}
                onDataProviderRemoved={jest.fn()}
                onToggleDataProviderEnabled={mockOnToggleDataProviderEnabled}
                onToggleDataProviderExcluded={jest.fn()}
                onToggleDataProviderType={jest.fn()}
              />
            </DroppableWrapper>
          </ManageGlobalTimeline>
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
      const mockOnToggleDataProviderExcluded = jest.fn();

      const wrapper = mount(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={dataProviders}
              timelineId="foo"
              onDataProviderEdited={jest.fn()}
              onDataProviderRemoved={jest.fn()}
              onToggleDataProviderEnabled={jest.fn()}
              onToggleDataProviderExcluded={mockOnToggleDataProviderExcluded}
              onToggleDataProviderType={jest.fn()}
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
        providerId: 'id-Provider 1',
      });
    });

    test('while loading data, it does NOT invoke the onToggleDataProviderExcluded callback when you click on the option "Exclude results" in the provider menu', () => {
      const dataProviders = mockDataProviders.slice(0, 1);
      dataProviders[0].and = mockDataProviders.slice(1, 3);
      const mockOnToggleDataProviderExcluded = jest.fn();

      const wrapper = mount(
        <TestProviders>
          <ManageGlobalTimeline manageTimelineForTesting={manageTimelineForTesting}>
            <DroppableWrapper droppableId="unitTest">
              <Providers
                browserFields={{}}
                dataProviders={dataProviders}
                timelineId="foo"
                onDataProviderEdited={jest.fn()}
                onDataProviderRemoved={jest.fn()}
                onToggleDataProviderEnabled={jest.fn()}
                onToggleDataProviderExcluded={mockOnToggleDataProviderExcluded}
                onToggleDataProviderType={jest.fn()}
              />
            </DroppableWrapper>
          </ManageGlobalTimeline>
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
