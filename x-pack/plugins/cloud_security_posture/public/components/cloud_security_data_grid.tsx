/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useMemo } from 'react';
import { useColumns } from '@kbn/unified-data-table';
import { type DataView } from '@kbn/data-views-plugin/common';
import { UnifiedDataTable, DataLoadingState } from '@kbn/unified-data-table';
import { CellActionsProvider } from '@kbn/cell-actions';
import { SORT_DEFAULT_ORDER_SETTING } from '@kbn/discover-utils';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import { DataTableRecord } from '@kbn/discover-utils/types';
import { useEuiTheme } from '@elastic/eui';
import { css, keyframes } from '@emotion/css';
import { cx } from '@emotion/css';
import { useKibana } from '../common/hooks/use_kibana';

export interface CloudSecurityDefaultColumn {
  id: string;
  displayName: string;
  cellRenderer?(rows: DataTableRecord[], rowIndex: number): React.Component;
}

export const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  const highlight = keyframes`
    0% { background-color: ${euiTheme.colors.warning};}
    50% { background-color: ${euiTheme.colors.emptyShade};}
    75% { background-color: ${euiTheme.colors.warning};}
    100% { background-color: ${euiTheme.colors.emptyShade};}
  `;

  const gridStyle = css`
    & .euiDataGridHeaderCell__icon {
      display: none;
    }
    & .euiDataGrid__controls {
      border-bottom: none;
      margin-bottom: ${euiTheme.size.s};

      & .euiButtonEmpty {
        font-weight: ${euiTheme.font.weight.bold};
      }
    }
    & .euiDataGrid__leftControls {
      > .euiButtonEmpty:hover:not(:disabled),
      .euiButtonEmpty:focus {
        text-decoration: none;
        cursor: default;
      }
    }
    & .euiButtonIcon {
      color: ${euiTheme.colors.primary};
    }
    & .euiDataGridRowCell {
      font-size: ${euiTheme.size.m};
    }
    & .euiDataGridRowCell__expandActions > [data-test-subj='euiDataGridCellExpandButton'] {
      display: none;
    }
    & .euiDataGridRowCell__contentByHeight + .euiDataGridRowCell__expandActions {
      padding: 0;
    }

    & .euiDataGridRowCell__expandFlex {
      align-items: center;
    }
    & .euiDataGridRowCell.euiDataGridRowCell--numeric {
      text-align: left;
    }
  `;

  const highlightStyle = css`
    & [data-test-subj='dataGridColumnSortingButton'] .euiButtonEmpty__text {
      animation: ${highlight} 1s ease-out infinite;
      color: ${euiTheme.colors.darkestShade};
    }
  `;

  const groupBySelector = css`
    width: 188px;
  `;

  return {
    highlightStyle,
    gridStyle,
    groupBySelector,
  };
};

interface CloudSecurityDataGridProps {
  dataView: DataView;
  isLoading: boolean;
  defaultColumns: CloudSecurityDefaultColumn[];
  sort: SortOrder[];
  rows: DataTableRecord[];
  pageSize: number;
  totalHits: number;
  sampleSize: number;
  selectedRowIndex?: number;
  renderDocumentView;
  setExpandedDoc;
  onUpdateRowsPerPage: (pageSize: number) => void;
}

export const CloudSecurityDataGrid = ({
  dataView,
  isLoading,
  defaultColumns,
  sort,
  rows,
  pageSize,
  totalHits,
  sampleSize,
  selectedRowIndex = -1,
  renderDocumentView,
  setExpandedDoc,
  onUpdateRowsPerPage,
}: CloudSecurityDataGridProps) => {
  // current set/order of columns (TODO: persist)
  const [columns, setColumns] = useState(defaultColumns.map((c) => c.id));

  // to allow for quick access to default column configurations
  const defaultColumnsMap = useMemo(() => {
    const m: { [key: string]: CloudSecurityDefaultColumn } = {};
    defaultColumns.reduce((prev, cur) => {
      prev[cur.id] = cur;

      return prev;
    }, m);

    return m;
  }, [defaultColumns]);

  // services needed for unified-data-table package
  const {
    uiSettings,
    uiActions,
    dataViews,
    data,
    application,
    theme,
    fieldFormats,
    dataViewFieldEditor,
    toastNotifications,
    storage,
  } = useKibana().services;
  const styles = useStyles();

  const { capabilities } = application;
  const { filterManager } = data.query;
  const services = {
    theme,
    fieldFormats,
    uiSettings,
    dataViewFieldEditor,
    toastNotifications,
    storage,
    data,
  };

  const useNewFieldsApi = true;
  const expandedDoc = rows[selectedRowIndex];

  const {
    columns: currentColumns,
    onAddColumn,
    onRemoveColumn,
    onMoveColumn,
    onSetColumns,
  } = useColumns({
    capabilities,
    defaultOrder: uiSettings.get(SORT_DEFAULT_ORDER_SETTING),
    dataView,
    dataViews,
    setAppState: (props) => console.log('setting app state', props),
    useNewFieldsApi,
    columns,
    sort,
  });

  const ariaLabelledBy = 'bla'; // TODO

  const DataGridMemoized = React.memo(UnifiedDataTable);

  return (
    <CellActionsProvider getTriggerCompatibleActions={uiActions.getTriggerCompatibleActions}>
      <DataGridMemoized
        // className={cx({ [styles.gridStyle]: true })}
        ariaLabelledBy={ariaLabelledBy}
        columns={currentColumns}
        expandedDoc={expandedDoc}
        dataView={dataView}
        loadingState={isLoading ? DataLoadingState.loading : DataLoadingState.loaded}
        onFilter={() => console.log('add filter')}
        onResize={(colSettings: { columnId: string; width: number }) => console.log(colSettings)}
        onSetColumns={onSetColumns}
        onSort={(newSort: string[][]) => console.log(newSort)}
        rows={rows}
        sampleSize={sampleSize}
        setExpandedDoc={setExpandedDoc}
        renderDocumentView={renderDocumentView}
        sort={sort}
        rowsPerPageState={pageSize}
        totalHits={totalHits}
        services={services}
        useNewFieldsApi
        onUpdateRowsPerPage={onUpdateRowsPerPage}
        configRowHeight={0}
        showTimeCol={false}
        // onMoveColumn={onMoveColumn}
        // onRemoveColumn={onRemoveColumn}
        // gridStyle={{
        //   border: 'horizontal',
        //   cellPadding: 'l',
        //   stripes: false,
        //   rowHover: 'none',
        //   header: 'underline',
        // }}
      />
    </CellActionsProvider>
  );
};
