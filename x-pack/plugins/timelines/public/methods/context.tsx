/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';

import type { AlertStatus, CustomBulkActionProp } from '../../common/types/timeline/actions';
import type { BrowserFields } from '../../common/search_strategy/index_fields';

import type {
  CellValueElementProps,
  ColumnHeaderOptions,
  ControlColumnProps,
  RowRenderer,
} from '../../common/types/timeline';

export interface TGridComponentState {
  /** The browser fields */
  browserFields: BrowserFields;

  /** The column headers */
  columnHeaders: ColumnHeaderOptions[];

  /** The actions column */
  customActionsColum?: {
    renderer: (props: EuiDataGridCellValueElementProps) => ReactNode;
    width: number;
  };

  /** Additional bulk actions */
  customBulkActions?: CustomBulkActionProp[];

  /** The alert filter status that has been selected */
  filterStatus?: AlertStatus;

  /** The current filter query */
  filterQuery?: string;

  /** The current indix/indices */
  indexName: string;

  /** Row action itmes */
  leadingControlColumns?: ControlColumnProps[];

  /** Renders a cell */
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;

  /** The row renderers */
  rowRenderers: RowRenderer[];

  /** Whether to show alert status bulk actions */
  showAlertStatusActions: boolean;

  /** The current timeline id */
  timelineId?: string;
}

const TGridComponentStateContext = createContext<TGridComponentState>({
  browserFields: {},
  columnHeaders: [],
  customBulkActions: [],
  filterStatus: 'open',
  indexName: '',
  renderCellValue: () => null,
  rowRenderers: [],
  showAlertStatusActions: false,
});

export const useTGridComponentState = () => {
  return useContext(TGridComponentStateContext);
};

export const TGridComponentStateProvider: React.FC<
  Pick<
    TGridComponentState,
    | 'browserFields'
    | 'columnHeaders'
    | 'customActionsColum'
    | 'customBulkActions'
    | 'filterStatus'
    | 'filterQuery'
    | 'indexName'
    | 'renderCellValue'
    | 'rowRenderers'
    | 'showAlertStatusActions'
    | 'timelineId'
  >
> = ({
  children,
  browserFields,
  columnHeaders,
  customActionsColum,
  customBulkActions,
  filterStatus,
  filterQuery,
  indexName,
  renderCellValue,
  rowRenderers,
  showAlertStatusActions,
  timelineId,
}) => {
  const providerValue: TGridComponentState = useMemo(() => {
    return {
      browserFields,
      columnHeaders,
      customActionsColum,
      customBulkActions,
      filterStatus,
      filterQuery,
      indexName,
      renderCellValue,
      rowRenderers,
      showAlertStatusActions,
      timelineId,
    };
  }, [
    browserFields,
    columnHeaders,
    customActionsColum,
    customBulkActions,
    filterStatus,
    filterQuery,
    indexName,
    renderCellValue,
    rowRenderers,
    showAlertStatusActions,
    timelineId,
  ]);

  return (
    <TGridComponentStateContext.Provider value={providerValue}>
      {children}
    </TGridComponentStateContext.Provider>
  );
};

TGridComponentStateProvider.displayName = 'TGridComponentStateProvider';
