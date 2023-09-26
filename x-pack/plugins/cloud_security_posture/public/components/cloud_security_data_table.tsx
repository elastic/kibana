/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { UnifiedDataTableSettings, useColumns } from '@kbn/unified-data-table';
import { DataViewField, type DataView } from '@kbn/data-views-plugin/common';
import { UnifiedDataTable, DataLoadingState } from '@kbn/unified-data-table';
import { CellActionsProvider } from '@kbn/cell-actions';
import {
  ROW_HEIGHT_OPTION,
  SHOW_MULTIFIELDS,
  SORT_DEFAULT_ORDER_SETTING,
} from '@kbn/discover-utils';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import { DataTableRecord } from '@kbn/discover-utils/types';
import { EuiDataGridStyle, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css, keyframes } from '@emotion/css';
import { cx } from '@emotion/css';
import { AddFieldFilterHandler } from '@kbn/unified-field-list';
import { generateFilters } from '@kbn/data-plugin/public';
import { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useKibana } from '../common/hooks/use_kibana';
import { CloudPostureTableResult } from '../common/hooks/use_cloud_posture_table';
import { FindingsGroupBySelector } from '../pages/configurations/layout/findings_group_by_selector';
import { vulnerabilitiesPathnameHandler } from '../pages/vulnerabilities/utils/vulnerabilities_pathname_handler';
import { CspEvaluationBadge } from './csp_evaluation_badge';
import { TimestampTableCell } from './timestamp_table_cell';
import { i18n } from '@kbn/i18n';

export interface CloudSecurityDefaultColumn {
  id: string;
  displayName?: string;
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
      border-top: none;
      & .euiButtonEmpty {
        font-weight: ${euiTheme.font.weight.bold};
      }
    }
    & .euiDataGrid--headerUnderline .euiDataGridHeaderCell {
      border-bottom: ${euiTheme.border.width.thick} solid ${euiTheme.colors.fullShade};
    }
    & .euiDataGridRowCell__contentByHeight + .euiDataGridRowCell__expandActions {
      padding: 0;
    }
    & .euiButtonIcon[data-test-subj='docTableExpandToggleColumn'] {
      color: ${euiTheme.colors.primary};
    }

    & .euiDataGridRowCell {
      font-size: ${euiTheme.size.m};
    }
    & .euiDataGridRowCell__expandFlex {
      align-items: center;
    }
    & .euiDataGridRowCell.euiDataGridRowCell--numeric {
      text-align: left;
    }
    & .euiDataGrid__controls {
      gap: ${euiTheme.size.s};
    }
    & .euiDataGrid__leftControls {
      display: flex;
      align-items: center;
      width: 100%;
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
    margin-left: auto;
  `;

  return {
    highlightStyle,
    gridStyle,
    groupBySelector,
  };
};

const gridStyle: EuiDataGridStyle = {
  border: 'horizontal',
  cellPadding: 'l',
  stripes: false,
  header: 'underline',
};

interface CloudSecurityDataGridProps {
  dataView: DataView;
  isLoading: boolean;
  defaultColumns: CloudSecurityDefaultColumn[];
  rows: DataTableRecord[];
  total: number;
  sort: SortOrder[];
  flyoutComponent: (hit: DataTableRecord, onCloseFlyout: () => void) => JSX.Element;
  cloudPostureTable: CloudPostureTableResult;
}

const cloudSecurityFieldLabels: Record<DataViewField['name'], string> = {
  'result.evaluation': i18n.translate(
    'xpack.csp.findings.findingsTable.findingsTableColumn.resultColumnLabel',
    {
      defaultMessage: 'Result',
    }
  ),
  'resource.id': i18n.translate(
    'xpack.csp.findings.findingsTable.findingsTableColumn.resourceIdColumnLabel',
    { defaultMessage: 'Resource ID' }
  ),
  'resource.name': i18n.translate(
    'xpack.csp.findings.findingsTable.findingsTableColumn.resourceNameColumnLabel',
    { defaultMessage: 'Resource Name' }
  ),
  'resource.sub_type': i18n.translate(
    'xpack.csp.findings.findingsTable.findingsTableColumn.resourceTypeColumnLabel',
    { defaultMessage: 'Resource Type' }
  ),
  'rule.benchmark.rule_number': i18n.translate(
    'xpack.csp.findings.findingsTable.findingsTableColumn.ruleNumberColumnLabel',
    {
      defaultMessage: 'Rule Number',
    }
  ),
  'rule.name': i18n.translate(
    'xpack.csp.findings.findingsTable.findingsTableColumn.ruleNameColumnLabel',
    { defaultMessage: 'Rule Name' }
  ),
  'rule.section': i18n.translate(
    'xpack.csp.findings.findingsTable.findingsTableColumn.ruleSectionColumnLabel',
    { defaultMessage: 'CIS Section' }
  ),
  '@timestamp': i18n.translate(
    'xpack.csp.findings.findingsTable.findingsTableColumn.lastCheckedColumnLabel',
    { defaultMessage: 'Last Checked' }
  ),
} as const;

// export const CloudSecurityDataTableComponent = ({
export const CloudSecurityDataTable = ({
  dataView,
  isLoading,
  defaultColumns,
  sort,
  rows,
  total,
  flyoutComponent,
  cloudPostureTable,
}: CloudSecurityDataGridProps) => {
  const [columns, setColumns] = useLocalStorage(
    'localStorageKey',
    defaultColumns.map((c) => c.id)
  );
  const [settings, setSettings] = useLocalStorage<UnifiedDataTableSettings>(
    'localStorageKeySettings',
    {
      columns: defaultColumns.reduce((prev, curr) => {
        const newColumn = { [curr.id]: {} };
        return { ...prev, ...newColumn };
      }, {} as UnifiedDataTableSettings['columns']),
    }
  );

  console.log({ dataView });
  useEffect(() => {
    dataView.fields.forEach((field, idx) => {
      if (dataView?.fields[idx]?.spec) {
        dataView.fields[idx].spec.customLabel = cloudSecurityFieldLabels[field.name] ?? field.name;
      }
    });
  });

  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>(undefined);

  const { pageSize, onChangeItemsPerPage, setUrlQuery, onSort } = cloudPostureTable;

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

  const { columns: currentColumns, onSetColumns } = useColumns({
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
            setUrlQuery({
              filters: newFilters,
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

  const ariaLabelledBy = 'Findings';

  return (
    <CellActionsProvider getTriggerCompatibleActions={uiActions.getTriggerCompatibleActions}>
      <div style={{ height: 'calc(100vh - 420px)' }}>
        <div className="eui-fullHeight">
          <UnifiedDataTable
            className={cx({ [styles.gridStyle]: true })}
            ariaLabelledBy={ariaLabelledBy}
            columns={currentColumns}
            expandedDoc={expandedDoc}
            dataView={dataView}
            loadingState={isLoading ? DataLoadingState.loading : DataLoadingState.loaded}
            onFilter={onAddFilter as DocViewFilterFn}
            onResize={onResize}
            onSetColumns={onSetColumns}
            onSort={onSort}
            rows={rows}
            sampleSize={500}
            setExpandedDoc={setExpandedDoc}
            renderDocumentView={renderDocumentView}
            sort={sort}
            rowsPerPageState={pageSize}
            totalHits={total}
            services={services}
            useNewFieldsApi
            onUpdateRowsPerPage={onChangeItemsPerPage}
            configRowHeight={uiSettings.get(ROW_HEIGHT_OPTION)}
            showMultiFields={uiSettings.get(SHOW_MULTIFIELDS)}
            showTimeCol={false}
            settings={settings}
            onFetchMoreRecords={() => {
              console.log('onFetchMoreRecords');
            }}
            externalCustomRenderers={{
              'result.evaluation': (props) => {
                return (
                  <CspEvaluationBadge type={rows[props.rowIndex].raw._source.result.evaluation} />
                );
              },
              '@timestamp': (props) => {
                return (
                  <TimestampTableCell timestamp={rows[props.rowIndex].raw._source['@timestamp']} />
                );
              },
            }}
            rowHeightState={0}
            externalAdditionalControls={
              <EuiFlexItem grow={false} className={styles.groupBySelector}>
                <FindingsGroupBySelector
                  type="default"
                  pathnameHandler={vulnerabilitiesPathnameHandler}
                />
              </EuiFlexItem>
            }
            gridStyle={gridStyle}
          />
        </div>
      </div>
    </CellActionsProvider>
  );
};

// export const CloudSecurityDataTable = React.memo(CloudSecurityDataTableComponent);
