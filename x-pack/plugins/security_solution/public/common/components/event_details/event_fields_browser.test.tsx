/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import '../../mock/match_media';
import { mockDetailItemData, mockDetailItemDataId } from '../../mock/mock_detail_item';
import { TestProviders } from '../../mock/test_providers';
import { timelineActions } from '../../../timelines/store/timeline';
import { EventFieldsBrowser } from './event_fields_browser';
import { mockBrowserFields } from '../../containers/source/mock';
import { useMountAppended } from '../../utils/use_mount_appended';

jest.mock('../link_to');

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

describe('EventFieldsBrowser', () => {
  const mount = useMountAppended();

  describe('column headers', () => {
    ['Field', 'Value'].forEach((header) => {
      test(`it renders the ${header} column header`, () => {
        const wrapper = mount(
          <TestProviders>
            <EventFieldsBrowser
              browserFields={mockBrowserFields}
              data={mockDetailItemData}
              eventId={mockDetailItemDataId}
              timelineId="test"
            />
          </TestProviders>
        );

        expect(wrapper.find('thead').containsMatchingElement(<span>{header}</span>)).toBeTruthy();
      });
    });
  });

  describe('filter input', () => {
    test('it renders a filter input with the expected placeholder', () => {
      const wrapper = mount(
        <TestProviders>
          <EventFieldsBrowser
            browserFields={mockBrowserFields}
            data={mockDetailItemData}
            eventId={mockDetailItemDataId}
            timelineId="test"
          />
        </TestProviders>
      );

      expect(wrapper.find('input[type="search"]').props().placeholder).toEqual(
        'Filter by Field, Value, or Description...'
      );
    });
  });

  describe('toggle column checkbox', () => {
    const eventId = 'pEMaMmkBUV60JmNWmWVi';

    test('it renders an UNchecked checkbox for a field that is not a member of columnHeaders', () => {
      const field = 'agent.id';

      const wrapper = mount(
        <TestProviders>
          <EventFieldsBrowser
            browserFields={mockBrowserFields}
            data={mockDetailItemData}
            eventId={eventId}
            timelineId="test"
          />
        </TestProviders>
      );

      expect(wrapper.find(`[data-test-subj="toggle-field-${field}"]`).first().props().checked).toBe(
        false
      );
    });

    test('it renders an checked checkbox for a field that is a member of columnHeaders', () => {
      const field = '@timestamp';

      const wrapper = mount(
        <TestProviders>
          <EventFieldsBrowser
            browserFields={mockBrowserFields}
            data={mockDetailItemData}
            eventId={eventId}
            timelineId="test"
          />
        </TestProviders>
      );

      expect(wrapper.find(`[data-test-subj="toggle-field-${field}"]`).first().props().checked).toBe(
        true
      );
    });

    test('it invokes toggleColumn when the checkbox is clicked', () => {
      const field = '@timestamp';

      const wrapper = mount(
        <TestProviders>
          <EventFieldsBrowser
            browserFields={mockBrowserFields}
            data={mockDetailItemData}
            eventId={eventId}
            timelineId="test"
          />
        </TestProviders>
      );

      wrapper
        .find(`[data-test-subj="toggle-field-${field}"]`)
        .find(`input[type="checkbox"]`)
        .first()
        .simulate('change', {
          target: { checked: true },
        });
      wrapper.update();

      expect(mockDispatch).toBeCalledWith(
        timelineActions.removeColumn({
          columnId: '@timestamp',
          id: 'test',
        })
      );
    });
  });

  describe('field type icon', () => {
    test('it renders the expected icon type for the data provided', () => {
      const wrapper = mount(
        <TestProviders>
          <EventFieldsBrowser
            browserFields={mockBrowserFields}
            data={mockDetailItemData}
            eventId={mockDetailItemDataId}
            timelineId="test"
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('.euiTableRow')
          .find('.euiTableRowCell')
          .at(1)
          .find('[data-euiicon-type]')
          .exists()
      ).toEqual(true);
    });
  });

  describe('field', () => {
    test('it renders the field name for the data provided', () => {
      const wrapper = mount(
        <TestProviders>
          <EventFieldsBrowser
            browserFields={mockBrowserFields}
            data={mockDetailItemData}
            eventId={mockDetailItemDataId}
            timelineId="test"
          />
        </TestProviders>
      );
      expect(wrapper.find('[data-test-subj="field-name"]').at(0).text()).toEqual('@timestamp');
    });

    test('it renders the expected icon for description', () => {
      const wrapper = mount(
        <TestProviders>
          <EventFieldsBrowser
            browserFields={mockBrowserFields}
            data={mockDetailItemData}
            eventId={mockDetailItemDataId}
            timelineId="test"
          />
        </TestProviders>
      );
      expect(
        wrapper
          .find('.euiTableRow')
          .find('.euiTableRowCell')
          .at(1)
          .find('[data-euiicon-type]')
          .last()
          .prop('data-euiicon-type')
      ).toEqual('iInCircle');
    });
  });

  describe('value', () => {
    test('it renders the expected value for the data provided', () => {
      const wrapper = mount(
        <TestProviders>
          <EventFieldsBrowser
            browserFields={mockBrowserFields}
            data={mockDetailItemData}
            eventId={mockDetailItemDataId}
            timelineId="test"
          />
        </TestProviders>
      );
      expect(wrapper.find('[data-test-subj="draggable-content-@timestamp"]').at(0).text()).toEqual(
        'Feb 28, 2019 @ 16:50:54.621'
      );
    });
  });

  describe('description', () => {
    test('it renders the expected field description the data provided', () => {
      const wrapper = mount(
        <TestProviders>
          <EventFieldsBrowser
            browserFields={mockBrowserFields}
            data={mockDetailItemData}
            eventId={mockDetailItemDataId}
            timelineId="test"
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('.euiTableRow')
          .find('.euiTableRowCell')
          .at(1)
          .find('EuiIconTip')
          .prop('content')
      ).toContain(
        'Date/time when the event originated. For log events this is the date/time when the event was generated, and not when it was read. Required field for all events. Example: 2016-05-23T08:05:34.853Z'
      );
    });
  });
});
