/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useMemo } from 'react';
import { UnifiedDataTableSettings, useColumns } from '@kbn/unified-data-table';
import { UnifiedDataTable, DataLoadingState } from '@kbn/unified-data-table';
import { CellActionsProvider } from '@kbn/cell-actions';
import { SHOW_MULTIFIELDS, SORT_DEFAULT_ORDER_SETTING } from '@kbn/discover-utils';
import { DataTableRecord } from '@kbn/discover-utils/types';
import { EuiDataGridCellValueElementProps, EuiDataGridStyle, EuiProgress } from '@elastic/eui';
import { AddFieldFilterHandler } from '@kbn/unified-field-list';
import { generateFilters } from '@kbn/data-plugin/public';
import { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useKibana } from '../../common/hooks/use_kibana';
import { CloudPostureDataTableResult } from '../../common/hooks/use_cloud_posture_data_table';
import { EmptyState } from '../empty_state';
import { MAX_FINDINGS_TO_LOAD } from '../../common/constants';
import { useStyles } from './use_styles';
import { AdditionalControls } from './additional_controls';
import { useDataViewContext } from '../../common/contexts/data_view_context';

export interface CloudSecurityDefaultColumn {
  id: string;
  width?: number;
}

const gridStyle: EuiDataGridStyle = {
  border: 'horizontal',
  cellPadding: 'l',
  stripes: false,
  header: 'underline',
};

const useNewFieldsApi = true;

// Hide Checkbox, enable open details Flyout
const controlColumnIds = ['openDetails'];

export interface CloudSecurityDataTableProps {
  isLoading: boolean;
  defaultColumns: CloudSecurityDefaultColumn[];
  rows: DataTableRecord[];
  total: number;
  /**
   * This is the component that will be rendered in the flyout when a row is expanded.
   * This component will receive the row data and a function to close the flyout.
   */
  flyoutComponent: (hit: DataTableRecord, onCloseFlyout: () => void) => JSX.Element;
  /**
   * This is the object that contains all the data and functions from the useCloudPostureDataTable hook.
   * This is also used to manage the table state from the parent component.
   */
  cloudPostureDataTable: CloudPostureDataTableResult;
  title: string;
  /**
   * This is a function that returns a map of column ids to custom cell renderers.
   * This is useful for rendering custom components for cells in the table.
   */
  customCellRenderer?: (rows: DataTableRecord[]) => {
    [key: string]: (props: EuiDataGridCellValueElementProps) => JSX.Element;
  };
  /**
   * Function to load more rows once the max number of rows has been reached.
   */
  loadMore: () => void;
  'data-test-subj'?: string;
  /**
   * This is the component that will be rendered in the group selector.
   * This component will receive the current group and a function to change the group.
   */
  groupSelectorComponent?: JSX.Element;
  /**
   * Height override for the data grid.
   */
  height?: number | string;
}

export const CloudSecurityDataTable = ({
  isLoading,
  defaultColumns,
  rows,
  total,
  flyoutComponent,
  cloudPostureDataTable,
  loadMore,
  title,
  customCellRenderer,
  groupSelectorComponent,
  height,
  ...rest
}: CloudSecurityDataTableProps) => {
  const {
    columnsLocalStorageKey,
    pageSize,
    onChangeItemsPerPage,
    setUrlQuery,
    onSort,
    onResetFilters,
    filters,
    sort,
  } = cloudPostureDataTable;

  const [columns, setColumns] = useLocalStorage(
    columnsLocalStorageKey,
    defaultColumns.map((c) => c.id)
  );
  const [settings, setSettings] = useLocalStorage<UnifiedDataTableSettings>(
    `${columnsLocalStorageKey}:settings`,
    {
      columns: defaultColumns.reduce((prev, curr) => {
        const columnDefaultSettings = curr.width ? { width: curr.width } : {};
        const newColumn = { [curr.id]: columnDefaultSettings };
        return { ...prev, ...newColumn };
      }, {} as UnifiedDataTableSettings['columns']),
    }
  );

  const { dataView, dataViewIsRefetching, dataViewRefetch } = useDataViewContext();

  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>(undefined);

  const renderDocumentView = (hit: DataTableRecord) =>
    flyoutComponent(hit, () => setExpandedDoc(undefined));

  // services needed for unified-data-table package
  const {
    uiSettings,
    uiActions,
    dataViews,
    data,
    application,
    theme,
    fieldFormats,
    toastNotifications,
    storage,
    dataViewFieldEditor,
  } = useKibana().services;

  const styles = useStyles();

  const { capabilities } = application;
  const { filterManager } = data.query;

  const services = {
    theme,
    fieldFormats,
    uiSettings,
    toastNotifications,
    storage,
    data,
    dataViewFieldEditor,
  };

  const {
    columns: currentColumns,
    onSetColumns,
    onAddColumn,
    onRemoveColumn,
  } = useColumns({
    capabilities,
    defaultOrder: uiSettings.get(SORT_DEFAULT_ORDER_SETTING),
    dataView,
    dataViews,
    setAppState: (props) => setColumns(props.columns),
    useNewFieldsApi,
    columns,
    sort,
  });

  const onAddFilter: AddFieldFilterHandler | undefined = useMemo(
    () =>
      filterManager && dataView
        ? (clickedField, values, operation) => {
            const newFilters = generateFilters(
              filterManager,
              clickedField,
              values,
              operation,
              dataView
            );
            filterManager.addFilters(newFilters);
            setUrlQuery({
              filters: filterManager.getFilters(),
            });
          }
        : undefined,
    [dataView, filterManager, setUrlQuery]
  );

  const onResize = (colSettings: { columnId: string; width: number }) => {
    const grid = settings || {};
    const newColumns = { ...(grid.columns || {}) };
    newColumns[colSettings.columnId] = {
      width: Math.round(colSettings.width),
    };
    const newGrid = { ...grid, columns: newColumns };
    setSettings(newGrid);
  };

  const externalCustomRenderers = useMemo(() => {
    if (!customCellRenderer) {
      return undefined;
    }
    return customCellRenderer(rows);
  }, [customCellRenderer, rows]);

  const onResetColumns = () => {
    setColumns(defaultColumns.map((c) => c.id));
  };

  if (!isLoading && !rows.length) {
    return <EmptyState onResetFilters={onResetFilters} />;
  }

  const externalAdditionalControls = (
    <AdditionalControls
      total={total}
      dataView={dataView}
      title={title}
      columns={currentColumns}
      onAddColumn={onAddColumn}
      onRemoveColumn={onRemoveColumn}
      groupSelectorComponent={groupSelectorComponent}
      onResetColumns={onResetColumns}
    />
  );

  const dataTableStyle = {
    // Change the height of the grid to fit the page
    // If there are filters, leave space for the filter bar
    // Todo: Replace this component with EuiAutoSizer
    height: height ?? `calc(100vh - ${filters?.length > 0 ? 454 : 414}px)`,
  };

  const rowHeightState = 0;

  const loadingStyle = {
    opacity: isLoading ? 1 : 0,
  };

  const loadingState =
    isLoading || dataViewIsRefetching ? DataLoadingState.loading : DataLoadingState.loaded;

  return (
    <CellActionsProvider getTriggerCompatibleActions={uiActions.getTriggerCompatibleActions}>
      <div
        data-test-subj={rest['data-test-subj']}
        className={styles.gridContainer}
        style={dataTableStyle}
      >
        <EuiProgress size="xs" color="accent" style={loadingStyle} />
        <UnifiedDataTable
          className={styles.gridStyle}
          ariaLabelledBy={title}
          columns={currentColumns}
          expandedDoc={expandedDoc}
          dataView={dataView}
          loadingState={loadingState}
          onFilter={onAddFilter as DocViewFilterFn}
          onResize={onResize}
          onSetColumns={onSetColumns}
          onSort={onSort}
          rows={rows}
          sampleSizeState={MAX_FINDINGS_TO_LOAD}
          setExpandedDoc={setExpandedDoc}
          renderDocumentView={renderDocumentView}
          sort={sort}
          rowsPerPageState={pageSize}
          totalHits={total}
          services={services}
          useNewFieldsApi
          onUpdateRowsPerPage={onChangeItemsPerPage}
          rowHeightState={rowHeightState}
          showMultiFields={uiSettings.get(SHOW_MULTIFIELDS)}
          showTimeCol={false}
          settings={settings}
          onFetchMoreRecords={loadMore}
          externalCustomRenderers={externalCustomRenderers}
          externalAdditionalControls={externalAdditionalControls}
          gridStyleOverride={gridStyle}
          rowLineHeightOverride="24px"
          controlColumnIds={controlColumnIds}
          onFieldEdited={dataViewRefetch}
        />
      </div>
    </CellActionsProvider>
  );
};
