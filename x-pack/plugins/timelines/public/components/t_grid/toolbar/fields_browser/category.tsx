/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiInMemoryTable } from '@elastic/eui';
import { noop } from 'lodash/fp';
import React, { useCallback, useMemo, useRef } from 'react';
import styled from 'styled-components';
import {
  arrayIndexToAriaIndex,
  DATA_COLINDEX_ATTRIBUTE,
  DATA_ROWINDEX_ATTRIBUTE,
  onKeyDownFocusHandler,
} from '../../../../../common';
import type { BrowserFields, OnUpdateColumns } from '../../../../../common';

import { CategoryTitle } from './category_title';
import { getFieldColumns } from './field_items';
import type { FieldItem } from './field_items';
import { CATEGORY_TABLE_CLASS_NAME, TABLE_HEIGHT } from './helpers';

import * as i18n from './translations';

const TableContainer = styled.div<{ height: number; width: number }>`
  ${({ height }) => `height: ${height}px`};
  ${({ width }) => `width: ${width}px`};
  overflow: hidden;
`;

TableContainer.displayName = 'TableContainer';

/**
 * This callback, invoked via `EuiInMemoryTable`'s `rowProps, assigns
 * attributes to every `<tr>`.
 */
const getAriaRowindex = (fieldItem: FieldItem) =>
  fieldItem.ariaRowindex != null ? { 'data-rowindex': fieldItem.ariaRowindex } : {};

interface Props {
  categoryId: string;
  fieldItems: FieldItem[];
  filteredBrowserFields: BrowserFields;
  onCategorySelected: (categoryId: string) => void;
  onUpdateColumns: OnUpdateColumns;
  timelineId: string;
  width: number;
}

export const Category = React.memo<Props>(
  ({ categoryId, filteredBrowserFields, fieldItems, onUpdateColumns, timelineId, width }) => {
    const containerElement = useRef<HTMLDivElement | null>(null);
    const onKeyDown = useCallback(
      (keyboardEvent: React.KeyboardEvent) => {
        onKeyDownFocusHandler({
          colindexAttribute: DATA_COLINDEX_ATTRIBUTE,
          containerElement: containerElement?.current,
          event: keyboardEvent,
          maxAriaColindex: 3,
          maxAriaRowindex: fieldItems.length,
          onColumnFocused: noop,
          rowindexAttribute: DATA_ROWINDEX_ATTRIBUTE,
        });
      },
      [fieldItems.length]
    );

    const fieldItemsWithRowindex = useMemo(
      () =>
        fieldItems.map((fieldItem, i) => ({
          ...fieldItem,
          ariaRowindex: arrayIndexToAriaIndex(i),
        })),
      [fieldItems]
    );

    const columns = useMemo(() => getFieldColumns(), []);

    return (
      <>
        <CategoryTitle
          categoryId={categoryId}
          filteredBrowserFields={filteredBrowserFields}
          onUpdateColumns={onUpdateColumns}
          timelineId={timelineId}
        />

        <TableContainer
          className="euiTable--compressed"
          data-test-subj="category-table-container"
          height={TABLE_HEIGHT}
          onKeyDown={onKeyDown}
          ref={containerElement}
          width={width}
        >
          <EuiInMemoryTable
            className={`${CATEGORY_TABLE_CLASS_NAME} eui-yScroll`}
            items={fieldItemsWithRowindex}
            columns={columns}
            pagination={false}
            rowProps={getAriaRowindex}
            sorting={false}
            tableCaption={i18n.CATEGORY_FIELDS_TABLE_CAPTION(categoryId)}
          />
        </TableContainer>
      </>
    );
  }
);

Category.displayName = 'Category';
