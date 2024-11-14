/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { EuiDataGridRowHeightsOptions, EuiDataGridStyle } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import type {
  Alert,
  AlertsTableImperativeApi,
  AlertsTableProps,
  RenderContext,
} from '@kbn/triggers-actions-ui-plugin/public/types';
import { ALERT_BUILDING_BLOCK_TYPE, AlertConsumers } from '@kbn/rule-data-utils';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import {
  dataTableActions,
  dataTableSelectors,
  tableDefaults,
  TableId,
} from '@kbn/securitysolution-data-table';
import type { SetOptional } from 'type-fest';
import { noop } from 'lodash';
import { useAlertsTableFieldsBrowserOptions } from '../../hooks/trigger_actions_alert_table/use_trigger_actions_browser_fields_options';
import { getBulkActionsByTableType } from '../../hooks/trigger_actions_alert_table/use_bulk_actions';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import type {
  SecurityAlertsTableContext,
  GetSecurityAlertsTableProp,
  SecurityAlertsTableProps,
} from './types';
import { ActionsCell } from '../../hooks/trigger_actions_alert_table/actions_cell';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useLicense } from '../../../common/hooks/use_license';
import {
  APP_ID,
  CASES_FEATURE_ID,
  ENABLE_VISUALIZATIONS_IN_FLYOUT_SETTING,
  VIEW_SELECTION,
} from '../../../../common/constants';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../../../timelines/components/timeline/body/constants';
import { defaultRowRenderers } from '../../../timelines/components/timeline/body/renderers';
import { eventsDefaultModel } from '../../../common/components/events_viewer/default_model';
import { GraphOverlay } from '../../../timelines/components/graph_overlay';
import {
  useSessionView,
  useSessionViewNavigation,
} from '../../../timelines/components/timeline/tabs/session/use_session_view';
import { inputsSelectors } from '../../../common/store';
import { combineQueries } from '../../../common/lib/kuery';
import { useInvalidFilterQuery } from '../../../common/hooks/use_invalid_filter_query';
import { StatefulEventContext } from '../../../common/components/events_viewer/stateful_event_context';
import { useSourcererDataView } from '../../../sourcerer/containers';
import type { RunTimeMappings } from '../../../sourcerer/store/model';
import { SourcererScopeName } from '../../../sourcerer/store/model';
import { useKibana, useUiSetting$ } from '../../../common/lib/kibana';
import { useDeepEqualSelector, useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { getColumns, CellValue } from '../../configurations/security_solution_detections';
import { buildTimeRangeFilter } from './helpers';
import { eventsViewerSelector } from '../../../common/components/events_viewer/selectors';
import type { State } from '../../../common/store';
import * as i18n from './translations';
import { eventRenderedViewColumns } from '../../configurations/security_solution_detections/columns';
import { getAlertsDefaultModel } from './default_config';
import { useFetchNotes } from '../../../notes/hooks/use_fetch_notes';
import { getDefaultControlColumn } from '../../../timelines/components/timeline/body/control_columns';
import { AdditionalToolbarControls } from '../../hooks/trigger_actions_alert_table/use_persistent_controls';
import { useFetchUserProfilesFromAlerts } from '../../configurations/security_solution_detections/fetch_page_context';
import { useCellActionsOptions } from '../../hooks/trigger_actions_alert_table/use_cell_actions';

const { updateIsLoading, updateTotalCount } = dataTableActions;

// we show a maximum of 6 action buttons
// - open flyout
// - investigate in timeline
// - 3-dot menu for more actions
// - add new note
// - session view
// - analyzer graph
const MAX_ACTION_BUTTON_COUNT = 6;
const DEFAULT_DATA_GRID_HEIGHT = 600;

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

  div .euiDataGridRowCell {
    display: flex;
    align-items: center;
  }

  div .euiDataGridRowCell > [data-focus-lock-disabled] {
    display: flex;
    align-items: center;
    flex-grow: 1;
    width: 100%;
  }

  div .euiDataGridRowCell__content {
    flex-grow: 1;
  }

  div .siemEventsTable__trSupplement--summary {
    display: block;
  }

  width: 100%;
`;

interface DetectionEngineAlertTableProps
  extends SetOptional<SecurityAlertsTableProps, 'id' | 'featureIds' | 'query'> {
  inputFilters?: Filter[];
  tableType: TableId;
  sourcererScope?: SourcererScopeName;
  isLoading?: boolean;
  onRuleChange?: () => void;
}

const initialSort: GetSecurityAlertsTableProp<'initialSort'> = [
  {
    '@timestamp': {
      order: 'desc',
    },
  },
];
const featureIds = [AlertConsumers.SIEM];
const casesConfiguration = { featureId: CASES_FEATURE_ID, owner: [APP_ID], syncAlerts: true };
const emptyInputFilters: Filter[] = [];

export const AlertsTableComponent: FC<DetectionEngineAlertTableProps> = ({
  inputFilters = emptyInputFilters,
  tableType = TableId.alertsOnAlertsPage,
  sourcererScope = SourcererScopeName.detections,
  isLoading,
  onRuleChange,
  ...tablePropsOverrides
}) => {
  const { id } = tablePropsOverrides;
  const {
    triggersActionsUi: { getAlertsStateTable: AlertsTable },
    uiSettings,
  } = useKibana().services;
  const [visualizationInFlyoutEnabled] = useUiSetting$<boolean>(
    ENABLE_VISUALIZATIONS_IN_FLYOUT_SETTING
  );

  const { from, to, setQuery } = useGlobalTime();

  const alertTableRefreshHandlerRef = useRef<(() => void) | null>(null);

  const dispatch = useDispatch();

  // Store context in state rather than creating object in provider value={} to prevent re-renders caused by a new object being created
  const [activeStatefulEventContext] = useState({
    timelineID: tableType,
    tabType: 'query',
    enableHostDetailsFlyout: true,
    enableIpDetailsFlyout: true,
    onRuleChange,
  });
  const { browserFields, sourcererDataView } = useSourcererDataView(sourcererScope);
  const license = useLicense();
  const isEnterprisePlus = license.isEnterprise();

  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const globalQuery = useDeepEqualSelector(getGlobalQuerySelector);
  const globalFilters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

  const getTable = useMemo(() => dataTableSelectors.getTableByIdSelector(), []);

  const isDataTableInitialized = useShallowEqualSelector(
    (state) => (getTable(state, tableType) ?? tableDefaults).initialized
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
      totalCount: count,
    } = getAlertsDefaultModel(license),
  } = useShallowEqualSelector((state: State) => eventsViewerSelector(state, tableType));

  const combinedQuery = useMemo(() => {
    if (browserFields != null && sourcererDataView) {
      return combineQueries({
        config: getEsQueryConfig(uiSettings),
        dataProviders: [],
        indexPattern: sourcererDataView,
        browserFields,
        filters: [...allFilters],
        kqlQuery: globalQuery,
        kqlMode: globalQuery.language,
      });
    }
    return null;
  }, [browserFields, globalQuery, sourcererDataView, uiSettings, allFilters]);

  useInvalidFilterQuery({
    id: tableType,
    filterQuery: combinedQuery?.filterQuery,
    kqlError: combinedQuery?.kqlError,
    query: globalQuery,
    startDate: from,
    endDate: to,
  });

  const finalBoolQuery: AlertsTableProps['query'] = useMemo(() => {
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

  const { onLoad } = useFetchNotes();
  const [tableContext, setTableContext] = useState<RenderContext<SecurityAlertsTableContext>>();

  const onUpdate: GetSecurityAlertsTableProp<'onUpdate'> = useCallback(
    (context) => {
      onLoad(context.alerts);
      setTableContext(context);
      alertTableRefreshHandlerRef.current = context.refresh;
      dispatch(
        updateIsLoading({
          id: tableType,
          isLoading: context.isLoading ?? true,
        })
      );
      dispatch(
        updateTotalCount({
          id: tableType,
          totalCount: context.alertsCount ?? -1,
        })
      );
      setQuery({
        id: tableType,
        loading: context.isLoading ?? true,
        refetch: context.refresh ?? noop,
        inspect: null,
      });
    },
    [dispatch, onLoad, setQuery, tableType]
  );
  const userProfiles = useFetchUserProfilesFromAlerts({
    alerts: tableContext?.alerts ?? [],
    columns: tableContext?.columns ?? [],
  });

  let ACTION_BUTTON_COUNT = MAX_ACTION_BUTTON_COUNT;

  // hiding the session view icon for users without enterprise plus license
  if (!isEnterprisePlus) {
    ACTION_BUTTON_COUNT--;
  }

  // we only want to show the note icon if the new notes system feature flag is enabled
  const securitySolutionNotesDisabled = useIsExperimentalFeatureEnabled(
    'securitySolutionNotesDisabled'
  );
  if (securitySolutionNotesDisabled) {
    ACTION_BUTTON_COUNT--;
  }

  // we do not show the analyzer graph and session view icons on the cases alerts tab alerts table
  // if the visualization in flyout advanced settings is disabled because these aren't supported inside the table
  if (tableType === TableId.alertsOnCasePage) {
    if (!isEnterprisePlus && !visualizationInFlyoutEnabled) {
      ACTION_BUTTON_COUNT -= 1;
    } else if (isEnterprisePlus && !visualizationInFlyoutEnabled) {
      ACTION_BUTTON_COUNT -= 2;
    }
  }

  const leadingControlColumn = useMemo(
    () => getDefaultControlColumn(ACTION_BUTTON_COUNT)[0],
    [ACTION_BUTTON_COUNT]
  );

  const additionalContext: SecurityAlertsTableContext = useMemo(
    () => ({
      rowRenderers: defaultRowRenderers,
      isDetails: false,
      truncate: true,
      isDraggable: false,
      leadingControlColumn,
      userProfiles,
      tableType,
      sourcererScope,
    }),
    [leadingControlColumn, sourcererScope, tableType, userProfiles]
  );

  const alertsTableRef = useRef<AlertsTableImperativeApi>(null);
  const fieldsBrowserOptions = useAlertsTableFieldsBrowserOptions(
    SourcererScopeName.detections,
    alertsTableRef.current?.toggleColumn
  );
  const cellActionsOptions = useCellActionsOptions(tableType, tableContext);
  const getBulkActions = useMemo(() => getBulkActionsByTableType(tableType), [tableType]);

  useEffect(() => {
    if (isDataTableInitialized) return;
    dispatch(
      dataTableActions.initializeDataTableSettings({
        id: tableType,
        title: i18n.SESSIONS_TITLE,
        defaultColumns: finalColumns.map((c) => ({
          initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
          ...c,
        })),
      })
    );
  }, [dispatch, tableType, finalColumns, isDataTableInitialized]);

  const { Navigation } = useSessionViewNavigation({
    scopeId: tableType,
  });

  const { SessionView } = useSessionView({
    scopeId: tableType,
  });

  const graphOverlay = useMemo(() => {
    const shouldShowOverlay =
      (graphEventId != null && graphEventId.length > 0) || sessionViewConfig != null;
    return shouldShowOverlay ? (
      <GraphOverlay scopeId={tableType} SessionView={SessionView} Navigation={Navigation} />
    ) : null;
  }, [graphEventId, tableType, sessionViewConfig, SessionView, Navigation]);

  const toolbarVisibility = useMemo(
    () => ({
      showColumnSelector: !isEventRenderedView,
      showSortSelector: !isEventRenderedView,
    }),
    [isEventRenderedView]
  );

  if (isLoading) {
    return null;
  }

  return (
    <div>
      {graphOverlay}
      <FullWidthFlexGroupTable $visible={!graphEventId && graphOverlay == null} gutterSize="none">
        <StatefulEventContext.Provider value={activeStatefulEventContext}>
          <EuiDataGridContainer hideLastPage={false}>
            <AlertsTable
              ref={alertsTableRef}
              // Stores separate configuration based on the view of the table
              id={id ?? `detection-engine-alert-table-${tableType}-${tableView}`}
              featureIds={featureIds}
              query={finalBoolQuery}
              initialSort={initialSort}
              casesConfiguration={casesConfiguration}
              gridStyle={gridStyle}
              shouldHighlightRow={shouldHighlightRow}
              rowHeightsOptions={rowHeightsOptions}
              columns={finalColumns}
              browserFields={finalBrowserFields}
              onUpdate={onUpdate}
              additionalContext={additionalContext}
              // if records are too less, we don't want table to be of fixed height.
              // it should shrink to the content height.
              // Height setting enables/disables virtualization depending on fixed/undefined height values respectively.
              height={count >= 20 ? `${DEFAULT_DATA_GRID_HEIGHT}px` : undefined}
              initialPageSize={50}
              runtimeMappings={sourcererDataView?.runtimeFieldMap as RunTimeMappings}
              toolbarVisibility={toolbarVisibility}
              dynamicRowHeight={isEventRenderedView}
              renderCellValue={CellValue}
              renderActionsCell={ActionsCell}
              renderAdditionalToolbarControls={
                tableType !== TableId.alertsOnCasePage ? AdditionalToolbarControls : undefined
              }
              actionsColumnWidth={leadingControlColumn.width}
              getBulkActions={getBulkActions}
              fieldsBrowserOptions={
                tableType === TableId.alertsOnAlertsPage ||
                tableType === TableId.alertsOnRuleDetailsPage
                  ? fieldsBrowserOptions
                  : undefined
              }
              cellActionsOptions={cellActionsOptions}
              showInspectButton
              {...tablePropsOverrides}
            />
          </EuiDataGridContainer>
        </StatefulEventContext.Provider>
      </FullWidthFlexGroupTable>
    </div>
  );
};
