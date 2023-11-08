/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridRowHeightsOptions, EuiDataGridStyle } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import type { FC } from 'react';
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { AlertsTableStateProps } from '@kbn/triggers-actions-ui-plugin/public/application/sections/alerts_table/alerts_table_state';
import type { Alert } from '@kbn/triggers-actions-ui-plugin/public/types';
import { ALERT_BUILDING_BLOCK_TYPE } from '@kbn/rule-data-utils';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import {
  dataTableActions,
  dataTableSelectors,
  tableDefaults,
  TableId,
} from '@kbn/securitysolution-data-table';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useLicense } from '../../../common/hooks/use_license';
import { VIEW_SELECTION } from '../../../../common/constants';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../../../timelines/components/timeline/body/constants';
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
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { useKibana } from '../../../common/lib/kibana';
import { useDeepEqualSelector, useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { getColumns } from '../../configurations/security_solution_detections';
import { buildTimeRangeFilter } from './helpers';
import { eventsViewerSelector } from '../../../common/components/events_viewer/selectors';
import type { State } from '../../../common/store';
import * as i18n from './translations';
import { eventRenderedViewColumns } from '../../configurations/security_solution_detections/columns';
import { getAlertsDefaultModel } from './default_config';

const { updateIsLoading, updateTotalCount } = dataTableActions;

// Highlight rows with building block alerts
const shouldHighlightRow = (alert: Alert) => !!alert[ALERT_BUILDING_BLOCK_TYPE];

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
  div .euiDataGridRowCell__contentWrapper {
    display: flex;
    align-items: center;
  }
  div .euiDataGridRowCell--lastColumn .euiDataGridRowCell__content {
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
  inputFilters: Filter[];
  tableId: TableId;
  sourcererScope?: SourcererScopeName;
  isLoading?: boolean;
  onRuleChange?: () => void;
}

export const AlertsTableComponent: FC<DetectionEngineAlertTableProps> = ({
  configId,
  inputFilters,
  tableId = TableId.alertsOnAlertsPage,
  sourcererScope = SourcererScopeName.detections,
  isLoading,
  onRuleChange,
}) => {
  const { triggersActionsUi, uiSettings } = useKibana().services;

  const { from, to, setQuery } = useGlobalTime();

  const alertTableRefreshHandlerRef = useRef<(() => void) | null>(null);

  const dispatch = useDispatch();

  // Store context in state rather than creating object in provider value={} to prevent re-renders caused by a new object being created
  const [activeStatefulEventContext] = useState({
    timelineID: tableId,
    tabType: 'query',
    enableHostDetailsFlyout: true,
    enableIpDetailsFlyout: true,
    onRuleChange,
  });
  const {
    browserFields,
    indexPattern: indexPatterns,
    runtimeMappings,
  } = useSourcererDataView(sourcererScope);
  const license = useLicense();

  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const globalQuery = useDeepEqualSelector(getGlobalQuerySelector);
  const globalFilters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

  const getTable = useMemo(() => dataTableSelectors.getTableByIdSelector(), []);

  const isDataTableInitialized = useShallowEqualSelector(
    (state) => (getTable(state, tableId) ?? tableDefaults).initialized
  );

  const timeRangeFilter = useMemo(() => buildTimeRangeFilter(from, to), [from, to]);

  const allFilters = useMemo(() => {
    return [...inputFilters, ...(globalFilters ?? []), ...(timeRangeFilter ?? [])];
  }, [inputFilters, globalFilters, timeRangeFilter]);

  const {
    dataTable: {
      graphEventId, // If truthy, the graph viewer (Resolver) is showing
      sessionViewConfig,
      viewMode: tableView = eventsDefaultModel.viewMode,
      columns,
    } = getAlertsDefaultModel(license),
  } = useShallowEqualSelector((state: State) => eventsViewerSelector(state, tableId));

  const combinedQuery = useMemo(() => {
    if (browserFields != null && indexPatterns != null) {
      return combineQueries({
        config: getEsQueryConfig(uiSettings),
        dataProviders: [],
        indexPattern: indexPatterns,
        browserFields,
        filters: [...allFilters],
        kqlQuery: globalQuery,
        kqlMode: globalQuery.language,
      });
    }
    return null;
  }, [browserFields, globalQuery, indexPatterns, uiSettings, allFilters]);

  useInvalidFilterQuery({
    id: tableId,
    filterQuery: combinedQuery?.filterQuery,
    kqlError: combinedQuery?.kqlError,
    query: globalQuery,
    startDate: from,
    endDate: to,
  });

  const finalBoolQuery: AlertsTableStateProps['query'] = useMemo(() => {
    if (combinedQuery?.kqlError || !combinedQuery?.filterQuery) {
      return { bool: {} };
    }
    return { bool: { filter: JSON.parse(combinedQuery?.filterQuery) } };
  }, [combinedQuery?.filterQuery, combinedQuery?.kqlError]);

  const isEventRenderedView = tableView === VIEW_SELECTION.eventRenderedView;

  const gridStyle = useMemo(
    () =>
      ({
        border: 'none',
        fontSize: 's',
        header: 'underline',
        stripes: isEventRenderedView,
      } as EuiDataGridStyle),
    [isEventRenderedView]
  );

  const rowHeightsOptions: EuiDataGridRowHeightsOptions | undefined = useMemo(() => {
    if (isEventRenderedView) {
      return {
        defaultHeight: 'auto',
      };
    }
    return undefined;
  }, [isEventRenderedView]);

  const alertColumns = useMemo(
    () => (columns.length ? columns : getColumns(license)),
    [columns, license]
  );

  const finalBrowserFields = useMemo(
    () => (isEventRenderedView ? {} : browserFields),
    [isEventRenderedView, browserFields]
  );

  const finalColumns = useMemo(
    () => (isEventRenderedView ? eventRenderedViewColumns : alertColumns),
    [alertColumns, isEventRenderedView]
  );

  const onAlertTableUpdate: AlertsTableStateProps['onUpdate'] = useCallback(
    ({ isLoading: isAlertTableLoading, totalCount, refresh }) => {
      dispatch(
        updateIsLoading({
          id: tableId,
          isLoading: isAlertTableLoading,
        })
      );

      dispatch(
        updateTotalCount({
          id: tableId,
          totalCount,
        })
      );

      alertTableRefreshHandlerRef.current = refresh;

      // setting Query
      setQuery({
        id: tableId,
        loading: isAlertTableLoading,
        refetch: refresh,
        inspect: null,
      });
    },
    [dispatch, tableId, alertTableRefreshHandlerRef, setQuery]
  );

  const alertStateProps: AlertsTableStateProps = useMemo(
    () => ({
      alertsTableConfigurationRegistry: triggersActionsUi.alertsTableConfigurationRegistry,
      configurationId: configId,
      // stores saperate configuration based on the view of the table
      id: `detection-engine-alert-table-${configId}-${tableView}`,
      featureIds: ['siem'],
      query: finalBoolQuery,
      gridStyle,
      shouldHighlightRow,
      rowHeightsOptions,
      columns: finalColumns,
      browserFields: finalBrowserFields,
      onUpdate: onAlertTableUpdate,
      runtimeMappings,
      toolbarVisibility: {
        showColumnSelector: !isEventRenderedView,
        showSortSelector: !isEventRenderedView,
      },
    }),
    [
      triggersActionsUi.alertsTableConfigurationRegistry,
      configId,
      tableView,
      finalBoolQuery,
      gridStyle,
      rowHeightsOptions,
      finalColumns,
      finalBrowserFields,
      onAlertTableUpdate,
      runtimeMappings,
      isEventRenderedView,
    ]
  );

  useEffect(() => {
    if (isDataTableInitialized) return;
    dispatch(
      dataTableActions.initializeDataTableSettings({
        id: tableId,
        title: i18n.SESSIONS_TITLE,
        defaultColumns: finalColumns.map((c) => ({
          initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
          ...c,
        })),
      })
    );
  }, [dispatch, tableId, finalColumns, isDataTableInitialized]);

  const AlertTable = useMemo(
    () => triggersActionsUi.getAlertsStateTable(alertStateProps),
    [alertStateProps, triggersActionsUi]
  );

  const { Navigation } = useSessionViewNavigation({
    scopeId: tableId,
  });

  const { DetailsPanel, SessionView } = useSessionView({
    entityType: 'events',
    scopeId: tableId,
  });

  const graphOverlay = useMemo(() => {
    const shouldShowOverlay =
      (graphEventId != null && graphEventId.length > 0) || sessionViewConfig != null;
    return shouldShowOverlay ? (
      <GraphOverlay scopeId={tableId} SessionView={SessionView} Navigation={Navigation} />
    ) : null;
  }, [graphEventId, tableId, sessionViewConfig, SessionView, Navigation]);

  if (isLoading) {
    return null;
  }

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
