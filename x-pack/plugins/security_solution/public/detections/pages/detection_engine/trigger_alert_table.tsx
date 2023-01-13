/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridRowHeightsOptions, EuiDataGridStyle, EuiFlyoutSize } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiProgress, EuiCheckbox } from '@elastic/eui';
import type { CustomFilter } from '@kbn/es-query';
import { buildQueryFromFilters } from '@kbn/es-query';
import type { FC } from 'react';
import React, { useState, useCallback, useMemo } from 'react';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { AlertsTableStateProps } from '@kbn/triggers-actions-ui-plugin/public/application/sections/alerts_table/alerts_table_state';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';
import { alertTableViewModeSelector } from '../../../common/store/alert_table/selectors';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { SHOW_EXTERNAL_ALERTS } from '../../../common/components/events_tab/translations';
import { RightTopMenu } from '../../../common/components/events_viewer/right_top_menu';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import type { TableId } from '../../../../common/types';
import { useKibana } from '../../../common/lib/kibana';
import type { ViewSelection } from '../../../common/components/events_viewer/summary_view_select';
import { ALERTS_TABLE_VIEW_SELECTION_KEY } from '../../../common/components/events_viewer/summary_view_select';
import { AdditionalFiltersAction } from '../../components/alerts_table/additional_filters_action';
import { changeAlertTableViewMode } from '../../../common/store/alert_table/actions';
import { useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { RenderCellValue } from '../../configurations/security_solution_detections';

const storage = new Storage(localStorage);

interface DetectionEngineAlertTableProps {
  configId: string;
  flyoutSize: EuiFlyoutSize;
  inputFilters: CustomFilter[];
  tableId: TableId;
  sourcererScope?: SourcererScopeName;
  onShowBuildingBlockAlertsChanged: (showBuildingBlockAlerts: boolean) => void;
  onShowOnlyThreatIndicatorAlertsChanged: (showOnlyThreatIndicatorAlerts: boolean) => void;
  showBuildingBlockAlerts: boolean;
  showOnlyThreatIndicatorAlerts: boolean;
}
export const DetectionEngineAlertTable: FC<DetectionEngineAlertTableProps> = ({
  configId,
  flyoutSize,
  inputFilters,
  tableId,
  sourcererScope = SourcererScopeName.detections,
  onShowOnlyThreatIndicatorAlertsChanged,
  showOnlyThreatIndicatorAlerts,
  onShowBuildingBlockAlertsChanged,
  showBuildingBlockAlerts,
}) => {
  const { triggersActionsUi } = useKibana().services;

  const dispatch = useDispatch();

  const boolQueryDSL = buildQueryFromFilters(inputFilters, undefined);

  const getViewMode = alertTableViewModeSelector();

  const storedTableView = storage.get(ALERTS_TABLE_VIEW_SELECTION_KEY);

  const stateTableView = useShallowEqualSelector((state) => getViewMode(state));

  const tableView = storedTableView ?? stateTableView;

  const handleChangeTableView = useCallback(
    (selectedView: ViewSelection) => {
      dispatch(
        changeAlertTableViewMode({
          viewMode: selectedView,
        })
      );
    },
    [dispatch]
  );

  const [showExternalAlerts, setShowExternalAlerts] = useState(false);
  const { browserFields } = useSourcererDataView(sourcererScope);

  const toggleExternalAlerts = useCallback(() => setShowExternalAlerts((s) => !s), []);

  const toggleExternalAlertsCheckbox = useMemo(
    () => (
      <EuiCheckbox
        id="showExternalAlertsCheckbox"
        data-test-subj="showExternalAlertsCheckbox"
        aria-label={SHOW_EXTERNAL_ALERTS}
        checked={showExternalAlerts}
        color="text"
        label={SHOW_EXTERNAL_ALERTS}
        onChange={toggleExternalAlerts}
      />
    ),
    [showExternalAlerts, toggleExternalAlerts]
  );

  const additionalFiltersComponent = useMemo(
    () => (
      <AdditionalFiltersAction
        areEventsLoading={false}
        onShowBuildingBlockAlertsChanged={onShowBuildingBlockAlertsChanged}
        showBuildingBlockAlerts={showBuildingBlockAlerts}
        onShowOnlyThreatIndicatorAlertsChanged={onShowOnlyThreatIndicatorAlertsChanged}
        showOnlyThreatIndicatorAlerts={showOnlyThreatIndicatorAlerts}
      />
    ),
    [
      onShowBuildingBlockAlertsChanged,
      onShowOnlyThreatIndicatorAlertsChanged,
      showBuildingBlockAlerts,
      showOnlyThreatIndicatorAlerts,
    ]
  );
  const additionalRightControls = useMemo(
    () => (
      <RightTopMenu
        tableView={tableView}
        loading={false}
        tableId={tableId}
        title={'Some Title'}
        onViewChange={handleChangeTableView}
        additionalFilters={additionalFiltersComponent}
        hasRightOffset={false}
      />
    ),
    [tableId, tableView, additionalFiltersComponent, handleChangeTableView]
  );

  const gridStyle: (isEventRenderedView: boolean) => EuiDataGridStyle = useCallback(
    (isEventRenderedView: boolean = false) => ({
      border: 'none',
      fontSize: 's',
      header: 'underline',
      stripes: isEventRenderedView,
    }),
    []
  );

  const EuiDataGridContainer = styled.div<{ hideLastPage: boolean }>`
    ul.euiPagination__list {
      li.euiPagination__item:last-child {
        ${({ hideLastPage }) => `${hideLastPage ? 'display:none' : ''}`};
      }
    }
    div .euiDataGridRowCell__contentByHeight {
      height: auto;
      align-self: center;
    }
    div .euiDataGridRowCell--lastColumn .euiDataGridRowCell__contentByHeight {
      flex-grow: 0;
      width: 100%;
    }
    div .siemEventsTable__trSupplement--summary {
      display: block;
    }
  `;

  const rowHeightsOptions: EuiDataGridRowHeightsOptions | undefined = useMemo(() => {
    if (tableView === 'eventRenderedView') {
      return {
        defaultHeight: 'auto' as const,
      };
    }
    return undefined;
  }, [tableView]);

  const alertStateProps: AlertsTableStateProps = useMemo(
    () => ({
      alertsTableConfigurationRegistry: triggersActionsUi.alertsTableConfigurationRegistry,
      configurationId: configId,
      id: `detection-engine-alert-table-${configId}`,
      flyoutSize,
      featureIds: ['siem'],
      query: {
        bool: boolQueryDSL,
      },
      showExpandToDetails: false,
      additionalControls: {
        right: additionalRightControls,
      },
      gridStyle: gridStyle(true),
      rowHeightsOptions,
      renderCellValue: RenderCellValue,
    }),
    [
      additionalRightControls,
      boolQueryDSL,
      configId,
      triggersActionsUi.alertsTableConfigurationRegistry,
      flyoutSize,
      gridStyle,
      rowHeightsOptions,
    ]
  );

  return false ? (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiProgress size="xs" color="primary" />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <EuiDataGridContainer hideLastPage={false}>
      {triggersActionsUi.getAlertsStateTable(alertStateProps)}
    </EuiDataGridContainer>
  );
};

DetectionEngineAlertTable.displayName = 'DetectionEngineAlertTable';
