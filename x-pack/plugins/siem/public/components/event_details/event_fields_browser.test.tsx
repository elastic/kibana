/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { mockDetailItemData, mockDetailItemDataId } from '../../mock/mock_detail_item';
import { TestProviders } from '../../mock/test_providers';

import { EventFieldsBrowser } from './event_fields_browser';

describe('EventFieldsBrowser', () => {
  describe('column headers', () => {
    ['Field', 'Value', 'Description'].forEach(header => {
      test(`it renders the ${header} column header`, () => {
        const wrapper = mountWithIntl(
          <TestProviders>
            <EventFieldsBrowser data={mockDetailItemData} eventId={mockDetailItemDataId} />
          </TestProviders>
        );

        expect(wrapper.find('thead').containsMatchingElement(<span>{header}</span>)).toBeTruthy();
      });
    });
  });

  describe('filter input', () => {
    test('it renders a filter input with the expected placeholder', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <EventFieldsBrowser data={mockDetailItemData} eventId={mockDetailItemDataId} />
        </TestProviders>
      );

      expect(wrapper.find('input[type="search"]').props().placeholder).toEqual(
        'Filter by Field, Value, or Description...'
      );
    });
  });

  describe('field type icon', () => {
    test('it renders the expected icon type for the data provided', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <EventFieldsBrowser data={mockDetailItemData} eventId={mockDetailItemDataId} />
        </TestProviders>
      );

      expect(
        wrapper
          .find('.euiTableRow')
          .find('.euiTableRowCell')
          .at(0)
          .find('svg')
          .exists()
      ).toEqual(true);
    });
  });

  describe('field', () => {
    test('it renders the field name for the data provided', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <EventFieldsBrowser data={mockDetailItemData} eventId={mockDetailItemDataId} />
        </TestProviders>
      );
      expect(
        wrapper
          .find('.euiTableRow')
          .find('.euiTableRowCell')
          .at(1)
          .containsMatchingElement(<span>_id</span>)
      ).toEqual(true);
    });
  });

  describe('value', () => {
    test('it renders the expected value for the data provided', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <EventFieldsBrowser data={mockDetailItemData} eventId={mockDetailItemDataId} />
        </TestProviders>
      );
      expect(
        wrapper
          .find('[data-test-subj="draggable-content"]')
          .at(0)
          .text()
      ).toEqual('pEMaMmkBUV60JmNWmWVi');
    });
  });

  describe('description', () => {
    test('it renders the expected field description the data provided', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <EventFieldsBrowser data={mockDetailItemData} eventId={mockDetailItemDataId} />
        </TestProviders>
      );

      expect(
        wrapper
          .find('.euiTableRow')
          .find('.euiTableRowCell')
          .at(3)
          .text()
      ).toContain('Each document has an _id that uniquely identifies it');
    });
  });
});
