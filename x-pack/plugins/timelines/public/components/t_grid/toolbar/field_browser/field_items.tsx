/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCheckbox,
  EuiIcon,
  EuiToolTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiScreenReaderOnly,
  EuiBadge,
  EuiBasicTableColumn,
  EuiTableActionsColumnType,
} from '@elastic/eui';
import { uniqBy } from 'lodash/fp';
import styled from 'styled-components';

import { getEmptyValue } from '../../../empty_value';
import { getExampleText, getIconFromType } from '../../../utils/helpers';
import type { BrowserFields } from '../../../../../common/search_strategy';
import type {
  ColumnHeaderOptions,
  BrowserFieldItem,
  FieldTableColumns,
  GetFieldTableColumns,
} from '../../../../../common/types';
import { defaultColumnHeaderType } from '../../body/column_headers/default_headers';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../../body/constants';
import { TruncatableText } from '../../../truncatable_text';
import { FieldName } from './field_name';
import * as i18n from './translations';
import { getAlertColumnHeader } from './helpers';

const TypeIcon = styled(EuiIcon)`
  margin: 0 4px;
  position: relative;
  top: -1px;
`;
TypeIcon.displayName = 'TypeIcon';

export const Description = styled.span`
  user-select: text;
  width: 400px;
`;
Description.displayName = 'Description';

/**
 * Returns the field items of all categories selected
 */
export const getFieldItems = ({
  browserFields,
  selectedCategoryIds,
  columnHeaders,
}: {
  browserFields: BrowserFields;
  selectedCategoryIds: string[];
  columnHeaders: ColumnHeaderOptions[];
}): BrowserFieldItem[] => {
  const categoryIds =
    selectedCategoryIds.length > 0 ? selectedCategoryIds : Object.keys(browserFields);
  const selectedFieldIds = new Set(columnHeaders.map(({ id }) => id));

  return uniqBy(
    'name',
    categoryIds.reduce<BrowserFieldItem[]>((fieldItems, categoryId) => {
      const categoryBrowserFields = Object.values(browserFields[categoryId]?.fields ?? {});
      if (categoryBrowserFields.length > 0) {
        fieldItems.push(
          ...categoryBrowserFields.map(({ name = '', ...field }) => ({
            name,
            type: field.type,
            description: field.description ?? '',
            example: field.example?.toString(),
            category: categoryId,
            selected: selectedFieldIds.has(name),
            isRuntime: !!field.runtimeField,
          }))
        );
      }
      return fieldItems;
    }, [])
  );
};

/**
 * Returns the column header for a field
 */
export const getColumnHeader = (timelineId: string, fieldName: string): ColumnHeaderOptions => ({
  columnHeaderType: defaultColumnHeaderType,
  id: fieldName,
  initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
  ...getAlertColumnHeader(timelineId, fieldName),
});

const getDefaultFieldTableColumns = (highlight: string): FieldTableColumns => [
  {
    field: 'name',
    name: i18n.NAME,
    render: (name: string, { type }) => {
      return (
        <EuiFlexGroup alignItems="center" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiToolTip content={type}>
              <TypeIcon
                data-test-subj={`field-${name}-icon`}
                type={getIconFromType(type ?? null)}
              />
            </EuiToolTip>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <FieldName fieldId={name} highlight={highlight} />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    },
    sortable: true,
    width: '225px',
  },
  {
    field: 'description',
    name: i18n.DESCRIPTION,
    render: (description: string, { name, example }) => (
      <EuiToolTip content={description}>
        <>
          <EuiScreenReaderOnly data-test-subj="descriptionForScreenReaderOnly">
            <p>{i18n.DESCRIPTION_FOR_FIELD(name)}</p>
          </EuiScreenReaderOnly>
          <TruncatableText>
            <Description data-test-subj={`field-${name}-description`}>
              {`${description ?? getEmptyValue()} ${getExampleText(example)}`}
            </Description>
          </TruncatableText>
        </>
      </EuiToolTip>
    ),
    sortable: true,
    width: '400px',
  },
  {
    field: 'category',
    name: i18n.CATEGORY,
    render: (category: string, { name }) => (
      <EuiBadge data-test-subj={`field-${name}-category`}>{category}</EuiBadge>
    ),
    sortable: true,
    width: '130px',
  },
];

/**
 * Returns a table column template provided to the `EuiInMemoryTable`'s
 * `columns` prop
 */
export const getFieldColumns = ({
  onToggleColumn,
  highlight = '',
  getFieldTableColumns,
  onHide,
}: {
  onToggleColumn: (id: string) => void;
  highlight?: string;
  getFieldTableColumns?: GetFieldTableColumns;
  onHide: () => void;
}): FieldTableColumns => [
  {
    field: 'selected',
    name: '',
    render: (selected: boolean, { name }) => (
      <EuiToolTip content={i18n.VIEW_COLUMN(name)}>
        <EuiCheckbox
          aria-label={i18n.VIEW_COLUMN(name)}
          checked={selected}
          data-test-subj={`field-${name}-checkbox`}
          data-colindex={1}
          id={name}
          onChange={() => onToggleColumn(name)}
        />
      </EuiToolTip>
    ),
    sortable: false,
    width: '25px',
  },
  ...(getFieldTableColumns
    ? getFieldTableColumns({ highlight, onHide })
    : getDefaultFieldTableColumns(highlight)),
];

/** Returns whether the table column has actions attached to it */
export const isActionsColumn = (column: EuiBasicTableColumn<BrowserFieldItem>): boolean => {
  return !!(column as EuiTableActionsColumnType<BrowserFieldItem>).actions?.length;
};
