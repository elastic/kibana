/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFlyoutSize } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiProgress } from '@elastic/eui';
import type { CustomFilter } from '@kbn/es-query';
import { buildQueryFromFilters } from '@kbn/es-query';
import type { AlertsTableStateProps } from '@kbn/triggers-actions-ui-plugin/public/application/sections/alerts_table/alerts_table_state';
import type { FC } from 'react';
import React, { useMemo } from 'react';
import { useLicense } from '../../../common/hooks/use_license';
import { getDefaultControlColumn } from '../../../timelines/components/timeline/body/control_columns';
import { useKibana } from '../../../common/lib/kibana';

interface DetectionEngineAlertTableProps {
  configId: string;
  flyoutSize: EuiFlyoutSize;
  filters: CustomFilter[];
}
export const DetectionEngineAlertTable: FC<DetectionEngineAlertTableProps> = ({
  configId,
  flyoutSize,
  filters,
}) => {
  const { triggersActionsUi } = useKibana().services;
  const isEnterprisePlus = useLicense().isEnterprise();
  const ACTION_BUTTON_COUNT = isEnterprisePlus ? 5 : 4;

  // const alertIdsQuery = useMemo(
  // () => ({
  // ids: {
  // values: getManualAlertIds(caseData.comments),
  // },
  // }),
  // [caseData.comments]
  // );
  //
  const boolQueryDSL = buildQueryFromFilters(filters, undefined);

  const leadingControlCols = useMemo(
    () => getDefaultControlColumn(ACTION_BUTTON_COUNT),
    [ACTION_BUTTON_COUNT]
  );

  const alertStateProps: AlertsTableStateProps = {
    alertsTableConfigurationRegistry: triggersActionsUi.alertsTableConfigurationRegistry,
    configurationId: configId,
    id: `detection-engine-alert-table-${configId}`,
    flyoutSize,
    featureIds: ['siem'],
    query: {
      bool: boolQueryDSL,
    },
    showExpandToDetails: true,
  };

  return false ? (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiProgress size="xs" color="primary" />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    triggersActionsUi.getAlertsStateTable(alertStateProps)
  );
};

DetectionEngineAlertTable.displayName = 'DetectionEngineAlertTable';

// const transformControlColumns = ({
// columnHeaders,
// controlColumns,
// data,
// fieldBrowserOptions,
// isEventViewer = false,
// loadingEventIds,
// onRowSelected,
// onRuleChange,
// selectedEventIds,
// showCheckboxes,
// tabType,
// timelineId,
// isSelectAllChecked,
// onSelectPage,
// browserFields,
// pageSize,
// sort,
// theme,
// setEventsLoading,
// setEventsDeleted,
// hasAlertsCrudPermissions,
// }: {
// columnHeaders: ColumnHeaderOptions[];
// controlColumns: ControlColumnProps[];
// data: TimelineItem[];
// disabledCellActions: string[];
// fieldBrowserOptions?: FieldBrowserOptions;
// isEventViewer?: boolean;
// loadingEventIds: string[];
// onRowSelected: OnRowSelected;
// onRuleChange?: () => void;
// selectedEventIds: Record<string, TimelineNonEcsData[]>;
// showCheckboxes: boolean;
// tabType: string;
// timelineId: string;
// isSelectAllChecked: boolean;
// browserFields: BrowserFields;
// onSelectPage: OnSelectAll;
// pageSize: number;
// sort: SortColumnTable[];
// theme: EuiTheme;
// setEventsLoading: SetEventsLoading;
// setEventsDeleted: SetEventsDeleted;
// hasAlertsCrudPermissions?: ({
// ruleConsumer,
// ruleProducer,
// }: {
// ruleConsumer: string;
// ruleProducer?: string;
// }) => boolean;
// }): EuiDataGridControlColumn[] =>
// controlColumns.map(
// ({ id: columnId, headerCellRender = EmptyHeaderCellRender, rowCellRender, width }, i) => ({
// id: `${columnId}`,
// headerCellRender: () => {
// const HeaderActions = headerCellRender;
// return (
// <>
// {HeaderActions && (
// <HeaderActions
// width={width}
// browserFields={browserFields}
// fieldBrowserOptions={fieldBrowserOptions}
// columnHeaders={columnHeaders}
// isEventViewer={isEventViewer}
// isSelectAllChecked={isSelectAllChecked}
// onSelectAll={onSelectPage}
// showEventsSelect={false}
// showSelectAllCheckbox={showCheckboxes}
// sort={sort}
// tabType={tabType}
// timelineId={timelineId}
// />
// )}
// </>
// );
// },
// rowCellRender: ({
// isDetails,
// isExpandable,
// isExpanded,
// rowIndex,
// colIndex,
// setCellProps,
// }: EuiDataGridCellValueElementProps) => {
// const pageRowIndex = getPageRowIndex(rowIndex, pageSize);
// const rowData = data[pageRowIndex];

// let disabled = false;
// if (rowData) {
// addBuildingBlockStyle(rowData.ecs, theme, setCellProps);
// if (columnId === 'checkbox-control-column' && hasAlertsCrudPermissions != null) {
// // FUTURE ENGINEER, the assumption here is you can only have one producer and consumer at this time
// const ruleConsumers =
// rowData.data.find((d) => d.field === ALERT_RULE_CONSUMER)?.value ?? [];
// const ruleProducers =
// rowData.data.find((d) => d.field === ALERT_RULE_PRODUCER)?.value ?? [];
// disabled = !hasAlertsCrudPermissions({
// ruleConsumer: ruleConsumers.length > 0 ? ruleConsumers[0] : '',
// ruleProducer: ruleProducers.length > 0 ? ruleProducers[0] : undefined,
// });
// }
// } else {
// // disable the cell when it has no data
// setCellProps({ style: { display: 'none' } });
// }

// return (
// <RowAction
// columnId={columnId ?? ''}
// columnHeaders={columnHeaders}
// controlColumn={controlColumns[i]}
// data={data}
// disabled={disabled}
// index={i}
// isDetails={isDetails}
// isExpanded={isExpanded}
// isEventViewer={isEventViewer}
// isExpandable={isExpandable}
// loadingEventIds={loadingEventIds}
// onRowSelected={onRowSelected}
// onRuleChange={onRuleChange}
// rowIndex={rowIndex}
// colIndex={colIndex}
// pageRowIndex={pageRowIndex}
// selectedEventIds={selectedEventIds}
// setCellProps={setCellProps}
// showCheckboxes={showCheckboxes}
// tabType={tabType}
// tableId={timelineId}
// width={width}
// setEventsLoading={setEventsLoading}
// setEventsDeleted={setEventsDeleted}
// />
// );
// },
// width,
// })
// );
