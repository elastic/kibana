/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { omit } from 'lodash/fp';
import { render } from '@testing-library/react';
import { EuiInMemoryTable } from '@elastic/eui';
import { mockBrowserFields } from '../../../../mock';
import { defaultColumnHeaderType } from '../../body/column_headers/default_headers';
import { DEFAULT_DATE_COLUMN_MIN_WIDTH } from '../../body/constants';

import { getFieldColumns, getFieldItems } from './field_items';
import { ColumnHeaderOptions } from '../../../../../common/types';

const timestampFieldId = '@timestamp';
const columnHeaders: ColumnHeaderOptions[] = [
  {
    category: 'base',
    columnHeaderType: defaultColumnHeaderType,
    description:
      'Date/time when the event originated.\nFor log events this is the date/time when the event was generated, and not when it was read.\nRequired field for all events.',
    example: '2016-05-23T08:05:34.853Z',
    id: timestampFieldId,
    type: 'date',
    aggregatable: true,
    initialWidth: DEFAULT_DATE_COLUMN_MIN_WIDTH,
  },
];

describe('field_items', () => {
  describe('getFieldItems', () => {
    const timestampField = mockBrowserFields.base.fields![timestampFieldId];

    it('should return browser field item format', () => {
      const fieldItems = getFieldItems({
        selectedCategoryIds: ['base'],
        browserFields: { base: { fields: { [timestampFieldId]: timestampField } } },
        columnHeaders: [],
      });

      expect(fieldItems[0]).toEqual({
        name: timestampFieldId,
        description: timestampField.description,
        category: 'base',
        selected: false,
        type: timestampField.type,
        example: timestampField.example,
        isRuntime: false,
      });
    });

    it('should return selected item', () => {
      const fieldItems = getFieldItems({
        selectedCategoryIds: ['base'],
        browserFields: { base: { fields: { [timestampFieldId]: timestampField } } },
        columnHeaders,
      });

      expect(fieldItems[0]).toMatchObject({
        selected: true,
      });
    });

    it('should return isRuntime field', () => {
      const fieldItems = getFieldItems({
        selectedCategoryIds: ['base'],
        browserFields: {
          base: {
            fields: {
              [timestampFieldId]: {
                ...timestampField,
                runtimeField: { type: 'keyword', script: { source: 'scripts are fun' } },
              },
            },
          },
        },
        columnHeaders,
      });

      expect(fieldItems[0]).toMatchObject({
        isRuntime: true,
      });
    });

    it('should return all field items of all categories if no category selected', () => {
      const fieldCount = Object.values(mockBrowserFields).reduce(
        (total, { fields }) => total + Object.keys(fields ?? {}).length,
        0
      );

      const fieldItems = getFieldItems({
        selectedCategoryIds: [],
        browserFields: mockBrowserFields,
        columnHeaders: [],
      });

      expect(fieldItems.length).toBe(fieldCount);
    });

    it('should return filtered field items of selected categories', () => {
      const selectedCategoryIds = ['base', 'event'];
      const fieldCount = selectedCategoryIds.reduce(
        (total, selectedCategoryId) =>
          total + Object.keys(mockBrowserFields[selectedCategoryId].fields ?? {}).length,
        0
      );

      const fieldItems = getFieldItems({
        selectedCategoryIds,
        browserFields: mockBrowserFields,
        columnHeaders: [],
      });

      expect(fieldItems.length).toBe(fieldCount);
    });
  });

  describe('getFieldColumns', () => {
    const onToggleColumn = jest.fn();
    const getFieldColumnsParams = { onToggleColumn, onHide: () => {} };

    beforeEach(() => {
      onToggleColumn.mockClear();
    });

    it('should return default field columns', () => {
      expect(
        getFieldColumns(getFieldColumnsParams).map((column) => omit('render', column))
      ).toEqual([
        {
          field: 'selected',
          name: '',
          sortable: false,
          width: '25px',
        },
        {
          field: 'name',
          name: 'Name',
          sortable: true,
          width: '225px',
        },
        {
          field: 'description',
          name: 'Description',
          sortable: true,
          width: '400px',
        },
        {
          field: 'category',
          name: 'Category',
          sortable: true,
          width: '130px',
        },
      ]);
    });

    it('should return custom field columns', () => {
      const customColumns = [
        {
          field: 'name',
          name: 'customColumn1',
          sortable: false,
          width: '225px',
        },
        {
          field: 'description',
          name: 'customColumn2',
          sortable: true,
          width: '400px',
        },
      ];

      expect(
        getFieldColumns({
          ...getFieldColumnsParams,
          getFieldTableColumns: () => customColumns,
        }).map((column) => omit('render', column))
      ).toEqual([
        {
          field: 'selected',
          name: '',
          sortable: false,
          width: '25px',
        },
        ...customColumns,
      ]);
    });

    it('should render default columns', () => {
      const timestampField = mockBrowserFields.base.fields![timestampFieldId];
      const fieldItems = getFieldItems({
        selectedCategoryIds: ['base'],
        browserFields: { base: { fields: { [timestampFieldId]: timestampField } } },
        columnHeaders: [],
      });

      const columns = getFieldColumns(getFieldColumnsParams);
      const { getByTestId, getAllByText } = render(
        <EuiInMemoryTable items={fieldItems} itemId="name" columns={columns} />
      );

      expect(getAllByText('Name').at(0)).toBeInTheDocument();
      expect(getAllByText('Description').at(0)).toBeInTheDocument();
      expect(getAllByText('Category').at(0)).toBeInTheDocument();

      expect(getByTestId(`field-${timestampFieldId}-checkbox`)).toBeInTheDocument();
      expect(getByTestId(`field-${timestampFieldId}-name`)).toBeInTheDocument();
      expect(getByTestId(`field-${timestampFieldId}-description`)).toBeInTheDocument();
      expect(getByTestId(`field-${timestampFieldId}-category`)).toBeInTheDocument();
    });

    it('should call call toggle callback on checkbox click', () => {
      const timestampField = mockBrowserFields.base.fields![timestampFieldId];
      const fieldItems = getFieldItems({
        selectedCategoryIds: ['base'],
        browserFields: { base: { fields: { [timestampFieldId]: timestampField } } },
        columnHeaders: [],
      });

      const columns = getFieldColumns(getFieldColumnsParams);
      const { getByTestId } = render(
        <EuiInMemoryTable items={fieldItems} itemId="name" columns={columns} />
      );

      getByTestId(`field-${timestampFieldId}-checkbox`).click();
      expect(onToggleColumn).toHaveBeenCalledWith(timestampFieldId);
    });
  });
});
