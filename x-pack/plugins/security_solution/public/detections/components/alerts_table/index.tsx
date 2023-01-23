/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridRowHeightsOptions, EuiDataGridStyle, EuiFlyoutSize } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import { buildQueryFromFilters } from '@kbn/es-query';
import type { FC } from 'react';
import React, { useState, useCallback, useMemo } from 'react';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { AlertsTableStateProps } from '@kbn/triggers-actions-ui-plugin/public/application/sections/alerts_table/alerts_table_state';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import { eventsDefaultModel } from '../../../common/components/events_viewer/default_model';
import { GraphOverlay } from '../../../timelines/components/graph_overlay';
import {
  useSessionView,
  useSessionViewNavigation,
} from '../../../timelines/components/timeline/session_tab_content/use_session_view';
import { inputsSelectors } from '../../../common/store';
import { combineQueries } from '../../../common/lib/kuery';
import { useInvalidFilterQuery } from '../../../common/hooks/use_invalid_filter_query';
import { StatefulEventContext } from '../../../common/components/events_viewer/stateful_event_context';
import { getDataTablesInStorageByIds } from '../../../timelines/containers/local_storage';
import { alertTableViewModeSelector } from '../../../common/store/alert_table/selectors';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { TableId } from '../../../../common/types';
import { useKibana } from '../../../common/lib/kibana';
import {
  VIEW_SELECTION,
  ALERTS_TABLE_VIEW_SELECTION_KEY,
} from '../../../common/components/events_viewer/summary_view_select';
import { useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { getColumns } from '../../configurations/security_solution_detections';
import { getColumnHeaders } from '../../../common/components/data_table/column_headers/helpers';
import { buildTimeRangeFilter } from './helpers';
import { eventsViewerSelector } from '../../../common/components/events_viewer/selectors';
import type { State } from '../../../common/store';

const storage = new Storage(localStorage);

interface GridContainerProps {
  hideLastPage: boolean;
}

export const FullWidthFlexGroupTable = styled(EuiFlexGroup)<{ $visible: boolean }>`
  overflow: hidden;
  margin: 0;
  display: ${({ $visible }) => ($visible ? 'flex' : 'none')};
`;

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
  width: 100%;
`;
interface DetectionEngineAlertTableProps {
  configId: string;
  flyoutSize: EuiFlyoutSize;
  inputFilters: Filter[];
  tableId: TableId;
  sourcererScope?: SourcererScopeName;
  from: string;
  to: string;
}
export const AlertsTableComponent: FC<DetectionEngineAlertTableProps> = ({
  configId,
  flyoutSize,
  inputFilters,
  tableId,
  sourcererScope = SourcererScopeName.detections,
  from,
  to,
}) => {
  const { triggersActionsUi, uiSettings } = useKibana().services;

  // Store context in state rather than creating object in provider value={} to prevent re-renders caused by a new object being created
  const [activeStatefulEventContext] = useState({
    timelineID: tableId,
    tabType: 'query',
    enableHostDetailsFlyout: true,
    enableIpDetailsFlyout: true,
  });
  const { browserFields, indexPattern: indexPatterns } = useSourcererDataView(sourcererScope);

  const getGlobalInputs = inputsSelectors.globalSelector();
  const globalInputs = useSelector((state) => getGlobalInputs(state));
  const { query: globalQuery, filters: globalFilters } = globalInputs;

  const timeRangeFilter = useMemo(() => buildTimeRangeFilter(from, to), [from, to]);

  const allFilters = useMemo(() => {
    return [...inputFilters, ...(globalFilters ?? []), ...(timeRangeFilter ?? [])];
  }, [inputFilters, globalFilters, timeRangeFilter]);

  const boolQueryDSL = buildQueryFromFilters(allFilters, undefined);

  const getGlobalQuery = useCallback(
    (customFilters?: Filter[]) => {
      if (browserFields != null && indexPatterns != null) {
        return combineQueries({
          config: getEsQueryConfig(uiSettings),
          dataProviders: [],
          indexPattern: indexPatterns,
          browserFields,
          filters: [...(customFilters ?? []), ...allFilters],
          kqlQuery: globalQuery,
          kqlMode: globalQuery.language,
        });
      }
      return null;
    },
    [browserFields, globalQuery, indexPatterns, uiSettings, allFilters]
  );

  useInvalidFilterQuery({
    id: tableId,
    filterQuery: getGlobalQuery([])?.filterQuery,
    kqlError: getGlobalQuery([])?.kqlError,
    query: globalQuery,
    startDate: from,
    endDate: to,
  });

  const getViewMode = alertTableViewModeSelector();

  const storedTableView = storage.get(ALERTS_TABLE_VIEW_SELECTION_KEY);

  const stateTableView = useShallowEqualSelector((state) => getViewMode(state));

  const tableView = storedTableView ?? stateTableView;

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
      gridStyle,
      rowHeightsOptions,
      columns: finalColumns,
      browserFields: finalBrowserFields,
    }),
    [
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

  const {
    dataTable: {
      graphEventId, // If truthy, the graph viewer (Resolver) is showing
      sessionViewConfig,
    } = eventsDefaultModel,
  } = useSelector((state: State) => eventsViewerSelector(state, tableId));

  const AlertTable = useMemo(
    () => triggersActionsUi.getAlertsStateTable(alertStateProps),
    [alertStateProps, triggersActionsUi]
  );

  const { Navigation } = useSessionViewNavigation({
    scopeId: tableId,
  });

  const { DetailsPanel, SessionView } = useSessionView({
    entityType: 'alerts',
    scopeId: tableId,
  });

  const graphOverlay = useMemo(() => {
    const shouldShowOverlay =
      (graphEventId != null && graphEventId.length > 0) || sessionViewConfig != null;
    return shouldShowOverlay ? (
      <GraphOverlay scopeId={tableId} SessionView={SessionView} Navigation={Navigation} />
    ) : null;
  }, [graphEventId, tableId, sessionViewConfig, SessionView, Navigation]);

  return (
    <div>
      {graphOverlay}
      <FullWidthFlexGroupTable $visible={!graphEventId && graphOverlay == null} gutterSize="none">
        <StatefulEventContext.Provider value={activeStatefulEventContext}>
          <EuiDataGridContainer hideLastPage={false}>{AlertTable}</EuiDataGridContainer>
        </StatefulEventContext.Provider>
      </FullWidthFlexGroupTable>
      {DetailsPanel}
    </div>
  );
};

AlertsTableComponent.displayName = 'DetectionEngineAlertTable';
