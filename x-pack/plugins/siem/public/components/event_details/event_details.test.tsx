/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { mockDetailItemData, mockDetailItemDataId } from '../../mock/mock_detail_item';
import { TestProviders } from '../../mock/test_providers';

import { EventDetails } from './event_details';
import { mockBrowserFields } from '../../containers/source/mock';

describe('EventDetails', () => {
  describe('rendering', () => {
    test('should match snapshot', () => {
      const wrapper = shallow(
        <TestProviders>
          <EventDetails
            browserFields={mockBrowserFields}
            data={mockDetailItemData}
            id={mockDetailItemDataId}
            isLoading={false}
            view="table-view"
            onUpdateColumns={jest.fn()}
            onViewSelected={jest.fn()}
            timelineId="test"
          />
        </TestProviders>
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('tabs', () => {
    ['Table', 'JSON View'].forEach(tab => {
      test(`it renders the ${tab} tab`, () => {
        const wrapper = mount(
          <TestProviders>
            <EventDetails
              browserFields={mockBrowserFields}
              data={mockDetailItemData}
              id={mockDetailItemDataId}
              isLoading={false}
              view="table-view"
              onUpdateColumns={jest.fn()}
              onViewSelected={jest.fn()}
              timelineId="test"
            />
          </TestProviders>
        );

        expect(
          wrapper
            .find('[data-test-subj="eventDetails"]')
            .find('[role="tablist"]')
            .containsMatchingElement(<span>{tab}</span>)
        ).toBeTruthy();
      });
    });

    test('the Table tab is selected by default', () => {
      const wrapper = mount(
        <TestProviders>
          <EventDetails
            browserFields={mockBrowserFields}
            data={mockDetailItemData}
            id={mockDetailItemDataId}
            isLoading={false}
            view="table-view"
            onUpdateColumns={jest.fn()}
            onViewSelected={jest.fn()}
            timelineId="test"
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-test-subj="eventDetails"]')
          .find('.euiTab-isSelected')
          .first()
          .text()
      ).toEqual('Table');
    });
  });
});
