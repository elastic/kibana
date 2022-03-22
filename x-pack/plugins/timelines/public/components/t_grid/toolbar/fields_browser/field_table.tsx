/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { EuiInMemoryTable, EuiText } from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { BrowserFields, ColumnHeaderOptions } from '../../../../../common';
import * as i18n from './translations';
import { getColumnHeader, getFieldColumns, getFieldItems, isActionsColumn } from './field_items';
import { CATEGORY_TABLE_CLASS_NAME, TABLE_HEIGHT } from './helpers';
import { tGridActions } from '../../../../store/t_grid';
import type { GetFieldTableColumns } from '../../../../../common/types/fields_browser';

export interface FieldTableProps {
  timelineId: string;
  columnHeaders: ColumnHeaderOptions[];
  /**
   * A map of categoryId -> metadata about the fields in that category,
   * filtered such that the name of every field in the category includes
   * the filter input (as a substring).
   */
  filteredBrowserFields: BrowserFields;
  /**
   * Optional function to customize field table columns
   */
  getFieldTableColumns?: GetFieldTableColumns;
  /**
   * The category selected on the left-hand side of the field browser
   */
  selectedCategoryIds: string[];
  /** The text displayed in the search input */
  /** Invoked when a user chooses to view a new set of columns in the timeline */
  searchInput: string;
  /**
   * Hides the field browser when invoked
   */
  onHide: () => void;
}

const TableContainer = styled.div<{ height: number }>`
  margin-top: ${({ theme }) => theme.eui.euiSizeXS};
  border-top: ${({ theme }) => theme.eui.euiBorderThin};
  ${({ height }) => `height: ${height}px`};
  overflow: hidden;
`;
TableContainer.displayName = 'TableContainer';

const Count = styled.span`
  font-weight: bold;
`;
Count.displayName = 'Count';

const FieldTableComponent: React.FC<FieldTableProps> = ({
  columnHeaders,
  filteredBrowserFields,
  getFieldTableColumns,
  searchInput,
  selectedCategoryIds,
  timelineId,
  onHide,
}) => {
  const dispatch = useDispatch();

  const fieldItems = useMemo(
    () =>
      getFieldItems({
        browserFields: filteredBrowserFields,
        selectedCategoryIds,
        columnHeaders,
      }),
    [columnHeaders, filteredBrowserFields, selectedCategoryIds]
  );

  const onToggleColumn = useCallback(
    (fieldId: string) => {
      if (columnHeaders.some(({ id }) => id === fieldId)) {
        dispatch(
          tGridActions.removeColumn({
            columnId: fieldId,
            id: timelineId,
          })
        );
      } else {
        dispatch(
          tGridActions.upsertColumn({
            column: getColumnHeader(timelineId, fieldId),
            id: timelineId,
            index: 1,
          })
        );
      }
    },
    [columnHeaders, dispatch, timelineId]
  );

  const columns = useMemo(
    () => getFieldColumns({ highlight: searchInput, onToggleColumn, getFieldTableColumns, onHide }),
    [onToggleColumn, searchInput, getFieldTableColumns, onHide]
  );
  const hasActions = useMemo(() => columns.some((column) => isActionsColumn(column)), [columns]);

  return (
    <>
      <EuiText data-test-subj="fields-showing" size="xs">
        {i18n.FIELDS_SHOWING}
        <Count data-test-subj="fields-count"> {fieldItems.length} </Count>
        {i18n.FIELDS_COUNT(fieldItems.length)}
      </EuiText>

      <TableContainer className="euiTable--compressed" height={TABLE_HEIGHT}>
        <EuiInMemoryTable
          data-test-subj="field-table"
          className={`${CATEGORY_TABLE_CLASS_NAME} eui-yScroll`}
          items={fieldItems}
          itemId="name"
          columns={columns}
          pagination={true}
          sorting={true}
          hasActions={hasActions}
        />
      </TableContainer>
    </>
  );
};

export const FieldTable = React.memo(FieldTableComponent);
