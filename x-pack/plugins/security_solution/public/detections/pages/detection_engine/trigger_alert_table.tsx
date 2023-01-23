/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridRowHeightsOptions, EuiDataGridStyle, EuiFlyoutSize } from '@elastic/eui';
import { EuiCheckbox } from '@elastic/eui';
import type { CustomFilter } from '@kbn/es-query';
import { buildQueryFromFilters } from '@kbn/es-query';
import type { FC } from 'react';
import React, { useState, useCallback, useMemo } from 'react';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { AlertsTableStateProps } from '@kbn/triggers-actions-ui-plugin/public/application/sections/alerts_table/alerts_table_state';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';
import { getTime } from '@kbn/data-plugin/public';
import { StatefulEventContext } from '../../../common/components/events_viewer/stateful_event_context';
import { getDataTablesInStorageByIds } from '../../../timelines/containers/local_storage';
import { alertTableViewModeSelector } from '../../../common/store/alert_table/selectors';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { SHOW_EXTERNAL_ALERTS } from '../../../common/components/events_tab/translations';
import { RightTopMenu } from '../../../common/components/events_viewer/right_top_menu';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { TableId } from '../../../../common/types';
import { useKibana } from '../../../common/lib/kibana';
import type { ViewSelection } from '../../../common/components/events_viewer/summary_view_select';
import {
  VIEW_SELECTION,
  ALERTS_TABLE_VIEW_SELECTION_KEY,
} from '../../../common/components/events_viewer/summary_view_select';
import { AdditionalFiltersAction } from '../../components/alerts_table/additional_filters_action';
import { changeAlertTableViewMode } from '../../../common/store/alert_table/actions';
import { useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { getColumns } from '../../configurations/security_solution_detections';
import { getColumnHeaders } from '../../../common/components/data_table/column_headers/helpers';

const storage = new Storage(localStorage);

interface GridContainerProps {
  hideLastPage: boolean;
}

const EuiDataGridContainer = styled.div<GridContainerProps>`
  ul.euiPagination__list {
    li.euiPagination__item:last-child {
      ${({ hideLastPage }) => {
        return `${hideLastPage ? 'display:none' : ''}`;
      }};
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
  from: string;
  to: string;
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
  from,
  to,
}) => {
  const { triggersActionsUi } = useKibana().services;

  // Store context in state rather than creating object in provider value={} to prevent re-renders caused by a new object being created
  const [activeStatefulEventContext] = useState({
    timelineID: tableId,
    tabType: 'query',
    enableHostDetailsFlyout: true,
    enableIpDetailsFlyout: true,
  });

  const dispatch = useDispatch();

  const timeRangeFilter = useMemo(
    () =>
      getTime(
        undefined,
        {
          from,
          to,
        },
        {
          fieldName: '@timestamp',
        }
      ),
    [from, to]
  );

  const allFilters = useMemo(() => {
    if (timeRangeFilter) {
      return [...inputFilters, timeRangeFilter];
    } else {
      return inputFilters;
    }
  }, [inputFilters, timeRangeFilter]);

  const boolQueryDSL = buildQueryFromFilters(allFilters, undefined);

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

  const gridStyle = useMemo(
    () =>
      ({
        border: 'none',
        fontSize: 's',
        header: 'underline',
        stripes: tableView === VIEW_SELECTION.eventRenderedView,
      } as EuiDataGridStyle),
    [tableView]
  );

  const rowHeightsOptions: EuiDataGridRowHeightsOptions | undefined = useMemo(() => {
    if (tableView === 'eventRenderedView') {
      return {
        defaultHeight: 'auto',
      };
    }
    return undefined;
  }, [tableView]);

  const dataTableStorage = getDataTablesInStorageByIds(storage, [TableId.alertsOnAlertsPage]);
  const columnsFormStorage = dataTableStorage?.[TableId.alertsOnAlertsPage]?.columns ?? [];
  const alertColumns = columnsFormStorage.length ? columnsFormStorage : getColumns();

  const evenRenderedColumns = useMemo(
    () => getColumnHeaders(alertColumns, browserFields, true),
    [alertColumns, browserFields]
  );

  const finalColumns = useMemo(
    () => (tableView === VIEW_SELECTION.eventRenderedView ? evenRenderedColumns : alertColumns),
    [evenRenderedColumns, alertColumns, tableView]
  );

  const finalBrowserFields = useMemo(
    () => (tableView === VIEW_SELECTION.eventRenderedView ? undefined : browserFields),
    [tableView, browserFields]
  );

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
      controls: {
        right: additionalRightControls,
      },
      gridStyle,
      rowHeightsOptions,
      columns: finalColumns,
      browserFields: finalBrowserFields,
    }),
    [
      additionalRightControls,
      boolQueryDSL,
      configId,
      triggersActionsUi.alertsTableConfigurationRegistry,
      flyoutSize,
      gridStyle,
      rowHeightsOptions,
      finalColumns,
      finalBrowserFields,
    ]
  );

  const AlertTable = useMemo(
    () => triggersActionsUi.getAlertsStateTable(alertStateProps),
    [alertStateProps, triggersActionsUi]
  );

  return (
    <StatefulEventContext.Provider value={activeStatefulEventContext}>
      <EuiDataGridContainer hideLastPage={false}>{AlertTable}</EuiDataGridContainer>
    </StatefulEventContext.Provider>
  );
};

DetectionEngineAlertTable.displayName = 'DetectionEngineAlertTable';
