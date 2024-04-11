/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// No bueno, I know! Encountered when reverting RBAC work post initial BCs
// Don't want to include large amounts of refactor in this temporary workaround
// TODO: Refactor code - component can be broken apart
import {
  EuiFlexGroup,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiWindowEvent,
  EuiHorizontalRule,
  EuiFlexItem,
} from '@elastic/eui';
import styled from 'styled-components';
import { noop } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ConnectedProps } from 'react-redux';
import { connect, useDispatch } from 'react-redux';
import type { Dispatch } from 'redux';
import { isTab } from '@kbn/timelines-plugin/public';
import type { Filter } from '@kbn/es-query';
import type { DocLinks } from '@kbn/doc-links';
import {
  dataTableActions,
  dataTableSelectors,
  tableDefaults,
  TableId,
} from '@kbn/securitysolution-data-table';
import { isEqual } from 'lodash';
import { AlertFilterControls } from '@kbn/alerts-ui-shared/src/alert_filter_controls';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { ControlGroupRenderer } from '@kbn/controls-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { URL_PARAM_ARRAY_EXCEPTION_MSG } from '@kbn/alerts-ui-shared/src/alert_filter_controls/translations';
import type { FilterGroupHandler, FilterControlConfig } from '@kbn/alerts-ui-shared';
import { FilterByAssigneesPopover } from '../../../common/components/filter_by_assignees_popover/filter_by_assignees_popover';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import type { AssigneesIdsSelection } from '../../../common/components/assignees/types';
import {
  ALERTS_TABLE_REGISTRY_CONFIG_IDS,
  DEFAULT_DETECTION_PAGE_FILTERS,
} from '../../../../common/constants';
import { useDataTableFilters } from '../../../common/hooks/use_data_table_filters';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { InputsModelId } from '../../../common/store/inputs/constants';
import { useDeepEqualSelector, useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { SecurityPageName } from '../../../app/types';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import type { UpdateDateRange } from '../../../common/components/charts/common';
import { FiltersGlobal } from '../../../common/components/filters_global';
import { getRulesUrl } from '../../../common/components/link_to/redirect_to_detection_engine';
import { SiemSearchBar } from '../../../common/components/search_bar';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { inputsSelectors } from '../../../common/store/inputs';
import { setAbsoluteRangeDatePicker } from '../../../common/store/inputs/actions';
import { NoApiIntegrationKeyCallOut } from '../../components/callouts/no_api_integration_callout';
import { useUserData } from '../../components/user_info';
import { DetectionEngineNoIndex } from './detection_engine_no_index';
import { useListsConfig } from '../../containers/detection_engine/lists/use_lists_config';
import { DetectionEngineUserUnauthenticated } from './detection_engine_user_unauthenticated';
import * as i18n from './translations';
import { SecuritySolutionLinkButton } from '../../../common/components/links';
import { useFormatUrl } from '../../../common/components/link_to';
import { useGlobalFullScreen } from '../../../common/containers/use_full_screen';
import { Display } from '../../../explore/hosts/pages/display';
import {
  focusUtilityBarAction,
  onTimelineTabKeyPressed,
  resetKeyboardFocus,
  showGlobalFilters,
} from '../../../timelines/components/timeline/helpers';
import {
  buildAlertAssigneesFilter,
  buildAlertStatusFilter,
  buildShowBuildingBlockFilter,
  buildThreatMatchFilter,
} from '../../components/alerts_table/default_config';
import { ChartPanels } from './chart_panels';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { useSignalHelpers } from '../../../common/containers/sourcerer/use_signal_helpers';

import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { NeedAdminForUpdateRulesCallOut } from '../../components/callouts/need_admin_for_update_callout';
import { MissingPrivilegesCallOut } from '../../components/callouts/missing_privileges_callout';
import { useKibana } from '../../../common/lib/kibana';
import { NoPrivileges } from '../../../common/components/no_privileges';
import { HeaderPage } from '../../../common/components/header_page';
import { EmptyPrompt } from '../../../common/components/empty_prompt';
import type { Status } from '../../../../common/api/detection_engine';
import { AlertsTableFilterGroup } from '../../components/alerts_table/alerts_filter_group';
import { GroupedAlertsTable } from '../../components/alerts_table/alerts_grouping';
import { AlertsTableComponent } from '../../components/alerts_table';
import type { AddFilterProps } from '../../components/alerts_kpis/common/types';
import { useInitializeUrlParam } from '../../../common/utils/global_query_string';
import { URL_PARAM_KEY } from '../../../common/hooks/use_url_state';

/**
 * Need a 100% height here to account for the graph/analyze tool, which sets no explicit height parameters, but fills the available space.
 */
const StyledFullHeightContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
`;

const SECURITY_ALERT_DATA_VIEW = {
  id: 'security_solution_alerts_dv',
  name: 'Security Solution Alerts DataView',
};

type DetectionEngineComponentProps = PropsFromRedux;

const DetectionEnginePageComponent: React.FC<DetectionEngineComponentProps> = ({
  clearEventsLoading,
  clearEventsDeleted,
}) => {
  const dispatch = useDispatch();
  const containerElement = useRef<HTMLDivElement | null>(null);
  const getTable = useMemo(() => dataTableSelectors.getTableByIdSelector(), []);
  const graphEventId = useShallowEqualSelector(
    (state) => (getTable(state, TableId.alertsOnAlertsPage) ?? tableDefaults).graphEventId
  );

  const isTableLoading = useShallowEqualSelector(
    (state) => (getTable(state, TableId.alertsOnAlertsPage) ?? tableDefaults).isLoading
  );

  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

  const { to, from } = useGlobalTime();
  const { globalFullScreen } = useGlobalFullScreen();
  const [
    {
      loading: userInfoLoading,
      isAuthenticated: isUserAuthenticated,
      hasEncryptionKey,
      signalIndexName,
      canUserREAD,
      hasIndexRead,
      hasIndexWrite,
      hasIndexMaintenance,
    },
  ] = useUserData();
  const { loading: listsConfigLoading, needsConfiguration: needsListsConfiguration } =
    useListsConfig();

  const [assignees, setAssignees] = useState<AssigneesIdsSelection[]>([]);
  const handleSelectedAssignees = useCallback(
    (newAssignees: AssigneesIdsSelection[]) => {
      if (!isEqual(newAssignees, assignees)) {
        setAssignees(newAssignees);
      }
    },
    [assignees]
  );

  const arePageFiltersEnabled = useIsExperimentalFeatureEnabled('alertsPageFiltersEnabled');

  // when arePageFiltersEnabled === false
  const [statusFilter, setStatusFilter] = useState<Status[]>([]);

  const updatedAt = useShallowEqualSelector(
    (state) => (getTable(state, TableId.alertsOnAlertsPage) ?? tableDefaults).updated
  );

  // when arePageFiltersEnabled === true
  const [detectionPageFilters, setDetectionPageFilters] = useState<Filter[]>();
  const [detectionPageFilterHandler, setDetectionPageFilterHandler] = useState<
    FilterGroupHandler | undefined
  >();

  const {
    sourcererDataView,
    runtimeMappings,
    loading: isLoadingIndexPattern,
    indexPattern,
  } = useSourcererDataView(SourcererScopeName.detections);
  const spaceId = useSpaceId();

  const [filterControlsUrlState, setFilterControlsUrlState] = useState<FilterControlConfig[]>();

  const onUrlParamInit = (param: FilterControlConfig[] | null) => {
    if (!param) {
      setFilterControlsUrlState([]);
      return;
    }
    try {
      if (!Array.isArray(param)) {
        throw new Error(URL_PARAM_ARRAY_EXCEPTION_MSG);
      }
      setFilterControlsUrlState(param);
    } catch (err) {
      // if there is an error ignore url Param
      // eslint-disable-next-line no-console
      console.error(err);
      setFilterControlsUrlState([]);
    }
  };

  useInitializeUrlParam(URL_PARAM_KEY.pageFilter, onUrlParamInit);

  const { formatUrl } = useFormatUrl(SecurityPageName.rules);

  const { showBuildingBlockAlerts, showOnlyThreatIndicatorAlerts } = useDataTableFilters(
    TableId.alertsOnAlertsPage
  );

  const loading = userInfoLoading || listsConfigLoading;
  const {
    http,
    notifications,
    application: { navigateToUrl },
    timelines: timelinesUi,
    data,
    dataViews,
  } = useKibana().services;

  const { filterManager } = data.query;

  const topLevelFilters = useMemo(() => {
    return [
      ...filters,
      ...buildShowBuildingBlockFilter(showBuildingBlockAlerts),
      ...buildThreatMatchFilter(showOnlyThreatIndicatorAlerts),
      ...buildAlertAssigneesFilter(assignees),
    ];
  }, [assignees, showBuildingBlockAlerts, showOnlyThreatIndicatorAlerts, filters]);

  const alertPageFilters = useMemo(() => {
    if (arePageFiltersEnabled) {
      return detectionPageFilters;
    }
    return buildAlertStatusFilter(statusFilter[0] ?? 'open');
  }, [statusFilter, detectionPageFilters, arePageFiltersEnabled]);

  useEffect(() => {
    if (!detectionPageFilterHandler) return;
    // if Alert is reloaded because of action by the user.
    // We want reload the values in the detection Page filters
    if (!isTableLoading) detectionPageFilterHandler.reload();
  }, [isTableLoading, detectionPageFilterHandler]);

  const addFilter = useCallback(
    ({ field, value, negate }: AddFilterProps) => {
      filterManager.addFilters([
        {
          meta: {
            alias: null,
            disabled: false,
            negate: negate ?? false,
          },
          ...(value != null
            ? { query: { match_phrase: { [field]: value } } }
            : { exists: { field } }),
        },
      ]);
    },
    [filterManager]
  );

  const updateDateRangeCallback = useCallback<UpdateDateRange>(
    ({ x }) => {
      if (!x) {
        return;
      }
      const [min, max] = x;
      dispatch(
        setAbsoluteRangeDatePicker({
          id: InputsModelId.global,
          from: new Date(min).toISOString(),
          to: new Date(max).toISOString(),
        })
      );
    },
    [dispatch]
  );

  const goToRules = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateToUrl(formatUrl(getRulesUrl()));
    },
    [formatUrl, navigateToUrl]
  );

  const alertsDefaultFilters = useMemo(
    () => [...topLevelFilters, ...(alertPageFilters ?? [])],
    [topLevelFilters, alertPageFilters]
  );

  // AlertsTable manages global filters itself, so not including `filters`
  const alertsTableDefaultFilters = useMemo(
    () => [
      ...buildShowBuildingBlockFilter(showBuildingBlockAlerts),
      ...buildThreatMatchFilter(showOnlyThreatIndicatorAlerts),
      ...(alertPageFilters ?? []),
      ...buildAlertAssigneesFilter(assignees),
    ],
    [assignees, showBuildingBlockAlerts, showOnlyThreatIndicatorAlerts, alertPageFilters]
  );

  const { signalIndexNeedsInit, pollForSignalIndex } = useSignalHelpers();

  const onSkipFocusBeforeEventsTable = useCallback(() => {
    focusUtilityBarAction(containerElement.current);
  }, [containerElement]);

  const onSkipFocusAfterEventsTable = useCallback(() => {
    resetKeyboardFocus();
  }, []);

  const onKeyDown = useCallback(
    (keyboardEvent: React.KeyboardEvent) => {
      if (isTab(keyboardEvent)) {
        onTimelineTabKeyPressed({
          containerElement: containerElement.current,
          keyboardEvent,
          onSkipFocusBeforeEventsTable,
          onSkipFocusAfterEventsTable,
        });
      }
    },
    [containerElement, onSkipFocusBeforeEventsTable, onSkipFocusAfterEventsTable]
  );

  const pageFiltersUpdateHandler = useCallback((newFilters: Filter[]) => {
    setDetectionPageFilters(newFilters);
    if (newFilters.length) {
      const newStatusFilter = newFilters.find(
        (filter) => filter.meta.key === 'kibana.alert.workflow_status'
      );
      if (newStatusFilter) {
        const status: Status[] = newStatusFilter.meta.params
          ? (newStatusFilter.meta.params as Status[])
          : [newStatusFilter.query?.match_phrase['kibana.alert.workflow_status']];
        setStatusFilter(status);
      } else {
        setStatusFilter([]);
      }
    }
  }, []);

  // Callback for when open/closed filter changes
  const onFilterGroupChangedCallback = useCallback(
    (newFilterGroup: Status) => {
      const timelineId = TableId.alertsOnAlertsPage;
      clearEventsLoading({ id: timelineId });
      clearEventsDeleted({ id: timelineId });
      setStatusFilter([newFilterGroup]);
    },
    [clearEventsLoading, clearEventsDeleted, setStatusFilter]
  );

  const areDetectionPageFiltersLoading = useMemo(() => {
    if (arePageFiltersEnabled) {
      return !Array.isArray(detectionPageFilters);
    }
    return false;
  }, [detectionPageFilters, arePageFiltersEnabled]);

  const isAlertTableLoading = useMemo(
    () => loading || areDetectionPageFiltersLoading,
    [loading, areDetectionPageFiltersLoading]
  );

  const isChartPanelLoading = useMemo(
    () => isLoadingIndexPattern || areDetectionPageFiltersLoading,
    [isLoadingIndexPattern, areDetectionPageFiltersLoading]
  );

  const showUpdating = useMemo(
    () => isAlertTableLoading || loading,
    [isAlertTableLoading, loading]
  );

  const dataViewSpec = useMemo(
    () =>
      indexPattern
        ? {
            id: SECURITY_ALERT_DATA_VIEW.id,
            name: SECURITY_ALERT_DATA_VIEW.name,
            allowNoIndex: true,
            title: indexPattern.title,
          }
        : null,
    [indexPattern]
  );

  const AlertPageFilters = useMemo(
    () =>
      !arePageFiltersEnabled ? (
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <AlertsTableFilterGroup
              status={statusFilter[0] ?? 'open'}
              onFilterGroupChanged={onFilterGroupChangedCallback}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="none">
              <EuiFlexItem grow={false}>
                {updatedAt &&
                  timelinesUi.getLastUpdated({
                    updatedAt: updatedAt || Date.now(),
                    showUpdating,
                  })}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : dataViewSpec ? (
        <AlertFilterControls
          controlsUrlState={filterControlsUrlState}
          spaceId={spaceId}
          featureIds={[AlertConsumers.SIEM]}
          filters={topLevelFilters}
          onFiltersChange={pageFiltersUpdateHandler}
          query={query}
          timeRange={{
            from,
            to,
            mode: 'absolute',
          }}
          chainingSystem="HIERARCHICAL"
          onInit={setDetectionPageFilterHandler}
          defaultControls={DEFAULT_DETECTION_PAGE_FILTERS}
          dataViewSpec={dataViewSpec}
          services={{
            http,
            notifications,
            dataViews,
            storage: Storage,
          }}
          ControlGroupRenderer={ControlGroupRenderer}
          maxControls={4}
        />
      ) : null,
    [
      arePageFiltersEnabled,
      dataViewSpec,
      dataViews,
      filterControlsUrlState,
      from,
      http,
      notifications,
      onFilterGroupChangedCallback,
      pageFiltersUpdateHandler,
      query,
      showUpdating,
      spaceId,
      statusFilter,
      timelinesUi,
      to,
      topLevelFilters,
      updatedAt,
    ]
  );

  const renderAlertTable = useCallback(
    (groupingFilters: Filter[]) => {
      return (
        <AlertsTableComponent
          configId={ALERTS_TABLE_REGISTRY_CONFIG_IDS.ALERTS_PAGE}
          inputFilters={[...alertsTableDefaultFilters, ...groupingFilters]}
          tableId={TableId.alertsOnAlertsPage}
          isLoading={isAlertTableLoading}
        />
      );
    },
    [alertsTableDefaultFilters, isAlertTableLoading]
  );

  if (loading) {
    return (
      <SecuritySolutionPageWrapper>
        <HeaderPage border title={i18n.PAGE_TITLE} isLoading={loading} />
        <EuiFlexGroup justifyContent="center" alignItems="center">
          <EuiLoadingSpinner size="xl" />
        </EuiFlexGroup>
      </SecuritySolutionPageWrapper>
    );
  }

  if (isUserAuthenticated != null && !isUserAuthenticated && !loading) {
    return (
      <SecuritySolutionPageWrapper>
        <HeaderPage border title={i18n.PAGE_TITLE} />
        <DetectionEngineUserUnauthenticated />
      </SecuritySolutionPageWrapper>
    );
  }

  if ((!loading && signalIndexNeedsInit) || needsListsConfiguration) {
    return (
      <SecuritySolutionPageWrapper>
        <HeaderPage border title={i18n.PAGE_TITLE} />
        <DetectionEngineNoIndex
          needsSignalsIndex={signalIndexNeedsInit}
          needsListsIndex={needsListsConfiguration}
        />
      </SecuritySolutionPageWrapper>
    );
  }
  return (
    <>
      {hasEncryptionKey != null && !hasEncryptionKey && <NoApiIntegrationKeyCallOut />}
      <NeedAdminForUpdateRulesCallOut />
      <MissingPrivilegesCallOut />
      {!signalIndexNeedsInit && (hasIndexRead === false || canUserREAD === false) ? (
        <NoPrivileges
          pageName={i18n.PAGE_TITLE.toLowerCase()}
          docLinkSelector={(docLinks: DocLinks) => docLinks.siem.privileges}
        />
      ) : !signalIndexNeedsInit && hasIndexRead && canUserREAD ? (
        <StyledFullHeightContainer onKeyDown={onKeyDown} ref={containerElement}>
          <EuiWindowEvent event="resize" handler={noop} />
          <FiltersGlobal show={showGlobalFilters({ globalFullScreen, graphEventId })}>
            <SiemSearchBar
              id={InputsModelId.global}
              pollForSignalIndex={pollForSignalIndex}
              sourcererDataView={sourcererDataView}
            />
          </FiltersGlobal>
          <SecuritySolutionPageWrapper
            noPadding={globalFullScreen}
            data-test-subj="detectionsAlertsPage"
          >
            <Display show={!globalFullScreen}>
              <HeaderPage title={i18n.PAGE_TITLE}>
                <EuiFlexGroup gutterSize="m">
                  <EuiFlexItem>
                    <FilterByAssigneesPopover
                      selectedUserIds={assignees}
                      onSelectionChange={handleSelectedAssignees}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <SecuritySolutionLinkButton
                      onClick={goToRules}
                      deepLinkId={SecurityPageName.rules}
                      data-test-subj="manage-alert-detection-rules"
                      fill
                    >
                      {i18n.BUTTON_MANAGE_RULES}
                    </SecuritySolutionLinkButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </HeaderPage>
              <EuiHorizontalRule margin="none" />
              <EuiSpacer size="l" />
              {AlertPageFilters}
              <EuiSpacer size="l" />
              <ChartPanels
                addFilter={addFilter}
                alertsDefaultFilters={alertsDefaultFilters}
                isLoadingIndexPattern={isChartPanelLoading}
                query={query}
                runtimeMappings={runtimeMappings}
                signalIndexName={signalIndexName}
                updateDateRangeCallback={updateDateRangeCallback}
              />
              <EuiSpacer size="l" />
            </Display>
            <GroupedAlertsTable
              currentAlertStatusFilterValue={statusFilter}
              defaultFilters={alertsTableDefaultFilters}
              from={from}
              globalFilters={filters}
              globalQuery={query}
              hasIndexMaintenance={hasIndexMaintenance ?? false}
              hasIndexWrite={hasIndexWrite ?? false}
              loading={isAlertTableLoading}
              renderChildComponent={renderAlertTable}
              runtimeMappings={runtimeMappings}
              signalIndexName={signalIndexName}
              tableId={TableId.alertsOnAlertsPage}
              to={to}
            />
          </SecuritySolutionPageWrapper>
        </StyledFullHeightContainer>
      ) : (
        <EmptyPrompt />
      )}
    </>
  );
};

const mapDispatchToProps = (dispatch: Dispatch) => ({
  clearSelected: ({ id }: { id: string }) => dispatch(dataTableActions.clearSelected({ id })),
  clearEventsLoading: ({ id }: { id: string }) =>
    dispatch(dataTableActions.clearEventsLoading({ id })),
  clearEventsDeleted: ({ id }: { id: string }) =>
    dispatch(dataTableActions.clearEventsDeleted({ id })),
});

const connector = connect(null, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const DetectionEnginePage = connector(React.memo(DetectionEnginePageComponent));
