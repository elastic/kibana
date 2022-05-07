/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import '../../mock/match_media';
import { mockDetailItemData, mockDetailItemDataId } from '../../mock/mock_detail_item';
import { TestProviders } from '../../mock/test_providers';
import { EventFieldsBrowser } from './event_fields_browser';
import { mockBrowserFields } from '../../containers/source/mock';
import { useMountAppended } from '../../utils/use_mount_appended';
import { TimelineTabs } from '../../../../common/types/timeline';
import { get } from 'lodash/fp';

jest.mock('../../lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

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
    ['Actions', 'Field', 'Value'].forEach((header) => {
      test(`it renders the ${header} column header`, () => {
        const wrapper = mount(
          <TestProviders>
            <EventFieldsBrowser
              browserFields={mockBrowserFields}
              data={mockDetailItemData}
              eventId={mockDetailItemDataId}
              timelineId="test"
              timelineTabType={TimelineTabs.query}
            />
          </TestProviders>
        );

        expect(wrapper.find('thead').contains(header)).toBeTruthy();
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
            timelineTabType={TimelineTabs.query}
          />
        </TestProviders>
      );

      expect(wrapper.find('input[type="search"]').props().placeholder).toEqual(
        'Filter by Field, Value, or Description...'
      );
    });
  });

  describe('Hover Actions', () => {
    const eventId = 'pEMaMmkBUV60JmNWmWVi';

    test('it renders a filter for (+) button', () => {
      const wrapper = mount(
        <TestProviders>
          <EventFieldsBrowser
            browserFields={mockBrowserFields}
            data={mockDetailItemData}
            eventId={eventId}
            timelineId="test"
            timelineTabType={TimelineTabs.query}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="hover-actions-filter-for"]').exists()).toBeTruthy();
    });

    test('it renders a filter out (-) button', () => {
      const wrapper = mount(
        <TestProviders>
          <EventFieldsBrowser
            browserFields={mockBrowserFields}
            data={mockDetailItemData}
            eventId={eventId}
            timelineId="test"
            timelineTabType={TimelineTabs.query}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="hover-actions-filter-out"]').exists()).toBeTruthy();
    });

    test('it renders an overflow button', () => {
      const wrapper = mount(
        <TestProviders>
          <EventFieldsBrowser
            browserFields={mockBrowserFields}
            data={mockDetailItemData}
            eventId={eventId}
            timelineId="test"
            timelineTabType={TimelineTabs.query}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="more-actions-@timestamp"]').exists()).toBeTruthy();
    });

    test('it does not render hover actions when readOnly prop is passed', () => {
      const wrapper = mount(
        <TestProviders>
          <EventFieldsBrowser
            browserFields={mockBrowserFields}
            data={mockDetailItemData}
            eventId={eventId}
            timelineId="test"
            timelineTabType={TimelineTabs.query}
            isReadOnly
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="hover-actions-filter-for"]').exists()).toBeFalsy();
      expect(wrapper.find('[data-test-subj="hover-actions-filter-out"]').exists()).toBeFalsy();
      expect(wrapper.find('[data-test-subj="more-actions-@timestamp"]').exists()).toBeFalsy();
    });

    test('it renders a column toggle button', () => {
      const wrapper = mount(
        <TestProviders>
          <EventFieldsBrowser
            browserFields={mockBrowserFields}
            data={mockDetailItemData}
            eventId={eventId}
            timelineId="test"
            timelineTabType={TimelineTabs.query}
          />
        </TestProviders>
      );

      expect(
        get(['items', 0, 'key'], wrapper.find('[data-test-subj="more-actions-@timestamp"]').props())
      ).toEqual('hover-actions-toggle-column');
    });

    test('it renders an add to timeline button', () => {
      const wrapper = mount(
        <TestProviders>
          <EventFieldsBrowser
            browserFields={mockBrowserFields}
            data={mockDetailItemData}
            eventId={eventId}
            timelineId="test"
            timelineTabType={TimelineTabs.query}
          />
        </TestProviders>
      );

      expect(
        get(['items', 1, 'key'], wrapper.find('[data-test-subj="more-actions-@timestamp"]').props())
      ).toEqual('hover-actions-add-timeline');
    });

    test('it renders a copy button', () => {
      const wrapper = mount(
        <TestProviders>
          <EventFieldsBrowser
            browserFields={mockBrowserFields}
            data={mockDetailItemData}
            eventId={eventId}
            timelineId="test"
            timelineTabType={TimelineTabs.query}
          />
        </TestProviders>
      );

      expect(
        get(['items', 2, 'key'], wrapper.find('[data-test-subj="more-actions-@timestamp"]').props())
      ).toEqual('hover-actions-copy-button');
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
            timelineTabType={TimelineTabs.query}
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
            timelineTabType={TimelineTabs.query}
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
            timelineTabType={TimelineTabs.query}
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
      ).toEqual('tokenDate');
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
            timelineTabType={TimelineTabs.query}
          />
        </TestProviders>
      );
      expect(wrapper.find('[data-test-subj="localized-date-tool-tip"]').at(0).text()).toEqual(
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
            timelineTabType={TimelineTabs.query}
          />
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="field-name-cell"]').at(0).find('EuiToolTip').prop('content')
      ).toContain(
        'Date/time when the event originated. For log events this is the date/time when the event was generated, and not when it was read. Required field for all events. Example: 2016-05-23T08:05:34.853Z'
      );
    });
  });
});
