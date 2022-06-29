/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { Fragment } from 'react';
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

import { getEmptyValue, getExampleText, getIconFromType } from './helpers';
import type {
  BrowserFields,
  BrowserFieldItem,
  FieldTableColumns,
  GetFieldTableColumns,
} from './types';
import { FieldName } from './field_name';
import * as i18n from './translations';
import { styles } from './field_items.style';

/**
 * Returns the field items of all categories selected
 */
export const getFieldItems = ({
  browserFields,
  selectedCategoryIds,
  columnIds,
}: {
  browserFields: BrowserFields;
  selectedCategoryIds: string[];
  columnIds: string[];
}): BrowserFieldItem[] => {
  const categoryIds =
    selectedCategoryIds.length > 0 ? selectedCategoryIds : Object.keys(browserFields);
  const selectedFieldIds = new Set(columnIds);

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

const getDefaultFieldTableColumns = (highlight: string): FieldTableColumns => [
  {
    field: 'name',
    name: i18n.NAME,
    render: (name: string, { type }) => {
      return (
        <EuiFlexGroup alignItems="center" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiToolTip content={type}>
              <EuiIcon
                data-test-subj={`field-${name}-icon`}
                css={styles.icon}
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
        <Fragment>
          <EuiScreenReaderOnly data-test-subj="descriptionForScreenReaderOnly">
            <p>{i18n.DESCRIPTION_FOR_FIELD(name)}</p>
          </EuiScreenReaderOnly>
          <span css={styles.truncatable}>
            <span css={styles.description} data-test-subj={`field-${name}-description`}>
              {`${description ?? getEmptyValue()} ${getExampleText(example)}`}
            </span>
          </span>
        </Fragment>
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
