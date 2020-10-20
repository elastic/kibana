/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import '../../mock/match_media';
import '../../mock/react_beautiful_dnd';
import {
  defaultHeaders,
  mockDetailItemData,
  mockDetailItemDataId,
  TestProviders,
} from '../../mock';

import { EventDetails, View } from './event_details';
import { mockBrowserFields } from '../../containers/source/mock';
import { useMountAppended } from '../../utils/use_mount_appended';

jest.mock('../link_to');
describe('EventDetails', () => {
  const mount = useMountAppended();
  const onEventToggled = jest.fn();
  const defaultProps = {
    browserFields: mockBrowserFields,
    columnHeaders: defaultHeaders,
    data: mockDetailItemData,
    id: mockDetailItemDataId,
    view: 'table-view' as View,
    onEventToggled,
    onUpdateColumns: jest.fn(),
    onViewSelected: jest.fn(),
    timelineId: 'test',
    toggleColumn: jest.fn(),
  };
  const wrapper = mount(
    <TestProviders>
      <EventDetails {...defaultProps} />
    </TestProviders>
  );

  describe('rendering', () => {
    test('should match snapshot', () => {
      const shallowWrap = shallow(<EventDetails {...defaultProps} />);
      expect(shallowWrap).toMatchSnapshot();
    });
  });

  describe('tabs', () => {
    ['Table', 'JSON View'].forEach((tab) => {
      test(`it renders the ${tab} tab`, () => {
        expect(
          wrapper
            .find('[data-test-subj="eventDetails"]')
            .find('[role="tablist"]')
            .containsMatchingElement(<span>{tab}</span>)
        ).toBeTruthy();
      });
    });

    test('the Table tab is selected by default', () => {
      expect(
        wrapper.find('[data-test-subj="eventDetails"]').find('.euiTab-isSelected').first().text()
      ).toEqual('Table');
    });

    test('it invokes `onEventToggled` when the collapse button is clicked', () => {
      wrapper.find('[data-test-subj="collapse"]').first().simulate('click');
      wrapper.update();

      expect(onEventToggled).toHaveBeenCalled();
    });
  });
});
