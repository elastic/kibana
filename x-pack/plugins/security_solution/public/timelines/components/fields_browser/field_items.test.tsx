/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash/fp';
import React from 'react';

import { mockBrowserFields } from '../../../common/containers/source/mock';
import { TestProviders } from '../../../common/mock';
import '../../../common/mock/match_media';
import { ColumnHeaderOptions } from '../../../timelines/store/timeline/model';
import { defaultColumnHeaderType } from '../timeline/body/column_headers/default_headers';
import { DEFAULT_DATE_COLUMN_MIN_WIDTH } from '../timeline/body/constants';

import { Category } from './category';
import { getFieldColumns, getFieldItems } from './field_items';
import { FIELDS_PANE_WIDTH } from './helpers';
import { useMountAppended } from '../../../common/utils/use_mount_appended';

const selectedCategoryId = 'base';
const selectedCategoryFields = mockBrowserFields[selectedCategoryId].fields;
const timestampFieldId = '@timestamp';
const columnHeaders: ColumnHeaderOptions[] = [
  {
    category: 'base',
    columnHeaderType: defaultColumnHeaderType,
    description:
      'Date/time when the event originated.\nFor log events this is the date/time when the event was generated, and not when it was read.\nRequired field for all events.',
    example: '2016-05-23T08:05:34.853Z',
    id: '@timestamp',
    type: 'date',
    aggregatable: true,
    width: DEFAULT_DATE_COLUMN_MIN_WIDTH,
  },
];

describe('field_items', () => {
  const timelineId = 'test';
  const mount = useMountAppended();

  describe('getFieldItems', () => {
    Object.keys(selectedCategoryFields!).forEach((fieldId) => {
      test(`it renders the name of the ${fieldId} field`, () => {
        const wrapper = mount(
          <TestProviders>
            <Category
              categoryId={selectedCategoryId}
              data-test-subj="category"
              filteredBrowserFields={mockBrowserFields}
              fieldItems={getFieldItems({
                browserFields: mockBrowserFields,
                category: mockBrowserFields[selectedCategoryId],
                categoryId: selectedCategoryId,
                columnHeaders: [],
                highlight: '',
                onUpdateColumns: jest.fn(),
                timelineId,
                toggleColumn: jest.fn(),
              })}
              width={FIELDS_PANE_WIDTH}
              onCategorySelected={jest.fn()}
              timelineId={timelineId}
            />
          </TestProviders>
        );

        expect(wrapper.find(`[data-test-subj="field-name-${fieldId}"]`).first().text()).toEqual(
          fieldId
        );
      });
    });

    Object.keys(selectedCategoryFields!).forEach((fieldId) => {
      test(`it renders a checkbox for the ${fieldId} field`, () => {
        const wrapper = mount(
          <TestProviders>
            <Category
              categoryId={selectedCategoryId}
              data-test-subj="category"
              filteredBrowserFields={mockBrowserFields}
              fieldItems={getFieldItems({
                browserFields: mockBrowserFields,
                category: mockBrowserFields[selectedCategoryId],
                categoryId: selectedCategoryId,
                columnHeaders: [],
                highlight: '',
                onUpdateColumns: jest.fn(),
                timelineId,
                toggleColumn: jest.fn(),
              })}
              width={FIELDS_PANE_WIDTH}
              onCategorySelected={jest.fn()}
              timelineId={timelineId}
            />
          </TestProviders>
        );

        expect(wrapper.find(`[data-test-subj="field-${fieldId}-checkbox"]`).first().exists()).toBe(
          true
        );
      });
    });

    test('it renders a checkbox in the checked state when the field is selected to be displayed as a column in the timeline', () => {
      const wrapper = mount(
        <TestProviders>
          <Category
            categoryId={selectedCategoryId}
            data-test-subj="category"
            filteredBrowserFields={mockBrowserFields}
            fieldItems={getFieldItems({
              browserFields: mockBrowserFields,
              category: mockBrowserFields[selectedCategoryId],
              categoryId: selectedCategoryId,
              columnHeaders,
              highlight: '',
              onUpdateColumns: jest.fn(),
              timelineId,
              toggleColumn: jest.fn(),
            })}
            width={FIELDS_PANE_WIDTH}
            onCategorySelected={jest.fn()}
            timelineId={timelineId}
          />
        </TestProviders>
      );

      expect(
        wrapper.find(`[data-test-subj="field-${timestampFieldId}-checkbox"]`).first().props()
          .checked
      ).toBe(true);
    });

    test('it does NOT render a checkbox in the checked state when the field is NOT selected to be displayed as a column in the timeline', () => {
      const wrapper = mount(
        <TestProviders>
          <Category
            categoryId={selectedCategoryId}
            data-test-subj="category"
            filteredBrowserFields={mockBrowserFields}
            fieldItems={getFieldItems({
              browserFields: mockBrowserFields,
              category: mockBrowserFields[selectedCategoryId],
              categoryId: selectedCategoryId,
              columnHeaders: columnHeaders.filter((header) => header.id !== timestampFieldId),
              highlight: '',
              onUpdateColumns: jest.fn(),
              timelineId,
              toggleColumn: jest.fn(),
            })}
            width={FIELDS_PANE_WIDTH}
            onCategorySelected={jest.fn()}
            timelineId={timelineId}
          />
        </TestProviders>
      );

      expect(
        wrapper.find(`[data-test-subj="field-${timestampFieldId}-checkbox"]`).first().props()
          .checked
      ).toBe(false);
    });

    test('it invokes `toggleColumn` when the user interacts with the checkbox', () => {
      const toggleColumn = jest.fn();

      const wrapper = mount(
        <TestProviders>
          <Category
            categoryId={selectedCategoryId}
            data-test-subj="category"
            filteredBrowserFields={mockBrowserFields}
            fieldItems={getFieldItems({
              browserFields: mockBrowserFields,
              category: mockBrowserFields[selectedCategoryId],
              categoryId: selectedCategoryId,
              columnHeaders: [],
              highlight: '',
              onUpdateColumns: jest.fn(),
              timelineId,
              toggleColumn,
            })}
            width={FIELDS_PANE_WIDTH}
            onCategorySelected={jest.fn()}
            timelineId={timelineId}
          />
        </TestProviders>
      );

      wrapper
        .find('input[type="checkbox"]')
        .first()
        .simulate('change', {
          target: { checked: true },
        });
      wrapper.update();

      expect(toggleColumn).toBeCalledWith({
        columnHeaderType: 'not-filtered',
        id: '@timestamp',
        width: 180,
      });
    });

    test('it renders the expected icon for a field', () => {
      const wrapper = mount(
        <TestProviders>
          <Category
            categoryId={selectedCategoryId}
            data-test-subj="category"
            filteredBrowserFields={mockBrowserFields}
            fieldItems={getFieldItems({
              browserFields: mockBrowserFields,
              category: mockBrowserFields[selectedCategoryId],
              categoryId: selectedCategoryId,
              columnHeaders,
              highlight: '',
              onUpdateColumns: jest.fn(),
              timelineId,
              toggleColumn: jest.fn(),
            })}
            width={FIELDS_PANE_WIDTH}
            onCategorySelected={jest.fn()}
            timelineId={timelineId}
          />
        </TestProviders>
      );

      expect(
        wrapper.find(`[data-test-subj="field-${timestampFieldId}-icon"]`).first().props().type
      ).toEqual('clock');
    });

    test('it renders the expected field description', () => {
      const wrapper = mount(
        <TestProviders>
          <Category
            categoryId={selectedCategoryId}
            data-test-subj="category"
            filteredBrowserFields={mockBrowserFields}
            fieldItems={getFieldItems({
              browserFields: mockBrowserFields,
              category: mockBrowserFields[selectedCategoryId],
              categoryId: selectedCategoryId,
              columnHeaders,
              highlight: '',
              onUpdateColumns: jest.fn(),
              timelineId,
              toggleColumn: jest.fn(),
            })}
            width={FIELDS_PANE_WIDTH}
            onCategorySelected={jest.fn()}
            timelineId={timelineId}
          />
        </TestProviders>
      );

      expect(
        wrapper.find(`[data-test-subj="field-${timestampFieldId}-description"]`).first().text()
      ).toEqual(
        'Date/time when the event originated. For log events this is the date/time when the event was generated, and not when it was read. Required field for all events. Example: 2016-05-23T08:05:34.853Z'
      );
    });
  });

  describe('getFieldColumns', () => {
    test('it returns the expected column definitions', () => {
      expect(getFieldColumns().map((column) => omit('render', column))).toEqual([
        { field: 'field', name: 'Field', sortable: true, width: '250px' },
        {
          field: 'description',
          name: 'Description',
          sortable: true,
          truncateText: true,
          width: '400px',
        },
      ]);
    });
  });
});
