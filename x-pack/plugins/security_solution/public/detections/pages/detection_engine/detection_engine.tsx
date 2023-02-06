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
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiWindowEvent,
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
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { FILTER_OPEN, TableId } from '../../../../common/types';
import { tableDefaults } from '../../../common/store/data_table/defaults';
import { dataTableActions, dataTableSelectors } from '../../../common/store/data_table';
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
import { AlertsTable } from '../../components/alerts_table';
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
import { LandingPageComponent } from '../../../common/components/landing_page';
import { DetectionPageFilterSet } from '../../components/detection_page_filters';
import type { FilterGroupHandler } from '../../../common/components/filter_group/types';
import type { Status } from '../../../../common/detection_engine/schemas/common/schemas';
import { AlertsTableFilterGroup } from '../../components/alerts_table/alerts_filter_group';
/**
 * Need a 100% height here to account for the graph/analyze tool, which sets no explicit height parameters, but fills the available space.
 */
const StyledFullHeightContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
`;

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
      hasIndexWrite = false,
      hasIndexMaintenance = false,
      canUserREAD,
      hasIndexRead,
    },
  ] = useUserData();
  const { loading: listsConfigLoading, needsConfiguration: needsListsConfiguration } =
    useListsConfig();

  const arePageFiltersEnabled = useIsExperimentalFeatureEnabled('alertsPageFiltersEnabled');

  // when arePageFiltersEnabled === false
  const [filterGroup, setFilterGroup] = useState<Status>(FILTER_OPEN);

  const updatedAt = useShallowEqualSelector(
    (state) => (getTable(state, TableId.alertsOnAlertsPage) ?? tableDefaults).updated
  );

  // when arePageFiltersEnabled === true
  const [detectionPageFilters, setDetectionPageFilters] = useState<Filter[]>();
  const [detectionPageFilterHandler, setDetectionPageFilterHandler] = useState<
    FilterGroupHandler | undefined
  >();

  const {
    indexPattern,
    runtimeMappings,
    dataViewId,
    loading: isLoadingIndexPattern,
  } = useSourcererDataView(SourcererScopeName.detections);

  const { formatUrl } = useFormatUrl(SecurityPageName.rules);
  const [showBuildingBlockAlerts, setShowBuildingBlockAlerts] = useState(false);
  const [showOnlyThreatIndicatorAlerts, setShowOnlyThreatIndicatorAlerts] = useState(false);
  const loading = userInfoLoading || listsConfigLoading;
  const {
    application: { navigateToUrl },
    timelines: timelinesUi,
    data,
  } = useKibana().services;

  const { filterManager } = data.query;

  const alertPageFilters = useMemo(() => {
    if (arePageFiltersEnabled) {
      return detectionPageFilters;
    }
    return buildAlertStatusFilter(filterGroup);
  }, [filterGroup, detectionPageFilters, arePageFiltersEnabled]);

  useEffect(() => {
    if (!detectionPageFilterHandler) return;
    // if Alert is reloaded because of action by the user.
    // We want reload the values in the detection Page filters
    if (!isTableLoading) detectionPageFilterHandler.reload();
  }, [isTableLoading, detectionPageFilterHandler]);

  const addFilter = useCallback(
    ({ field, value }: { field: string; value: string | number }) => {
      filterManager.addFilters([
        {
          meta: {
            alias: null,
            disabled: false,
            negate: false,
          },
          query: { match_phrase: { [field]: value } },
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

  const alertsHistogramDefaultFilters = useMemo(
    () => [
      ...filters,
      ...buildShowBuildingBlockFilter(showBuildingBlockAlerts),
      ...buildThreatMatchFilter(showOnlyThreatIndicatorAlerts),
      ...(alertPageFilters ?? []),
    ],
    [filters, showBuildingBlockAlerts, showOnlyThreatIndicatorAlerts, alertPageFilters]
  );

  // AlertsTable manages global filters itself, so not including `filters`
  const alertsTableDefaultFilters = useMemo(
    () => [
      ...buildShowBuildingBlockFilter(showBuildingBlockAlerts),
      ...buildThreatMatchFilter(showOnlyThreatIndicatorAlerts),
      ...(alertPageFilters ?? []),
    ],
    [showBuildingBlockAlerts, showOnlyThreatIndicatorAlerts, alertPageFilters]
  );

  const onShowBuildingBlockAlertsChangedCallback = useCallback(
    (newShowBuildingBlockAlerts: boolean) => {
      setShowBuildingBlockAlerts(newShowBuildingBlockAlerts);
    },
    [setShowBuildingBlockAlerts]
  );

  const onShowOnlyThreatIndicatorAlertsCallback = useCallback(
    (newShowOnlyThreatIndicatorAlerts: boolean) => {
      setShowOnlyThreatIndicatorAlerts(newShowOnlyThreatIndicatorAlerts);
    },
    [setShowOnlyThreatIndicatorAlerts]
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
  }, []);

  // Callback for when open/closed filter changes
  const onFilterGroupChangedCallback = useCallback(
    (newFilterGroup: Status) => {
      const timelineId = TableId.alertsOnAlertsPage;
      clearEventsLoading({ id: timelineId });
      clearEventsDeleted({ id: timelineId });
      setFilterGroup(newFilterGroup);
    },
    [clearEventsLoading, clearEventsDeleted, setFilterGroup]
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

  const AlertPageFilters = useMemo(
    () =>
      !arePageFiltersEnabled ? (
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <AlertsTableFilterGroup
              status={filterGroup}
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
      ) : (
        <DetectionPageFilterSet
          dataViewId={dataViewId}
          onFilterChange={pageFiltersUpdateHandler}
          filters={filters}
          query={query}
          timeRange={{
            from,
            to,
            mode: 'absolute',
          }}
          chainingSystem="NONE"
          onInit={setDetectionPageFilterHandler}
        />
      ),
    [
      arePageFiltersEnabled,
      dataViewId,
      filterGroup,
      filters,
      onFilterGroupChangedCallback,
      pageFiltersUpdateHandler,
      showUpdating,
      from,
      query,
      timelinesUi,
      to,
      updatedAt,
    ]
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
              indexPattern={indexPattern}
            />
          </FiltersGlobal>
          <SecuritySolutionPageWrapper
            noPadding={globalFullScreen}
            data-test-subj="detectionsAlertsPage"
          >
            <Display show={!globalFullScreen}>
              <HeaderPage title={i18n.PAGE_TITLE}>
                <SecuritySolutionLinkButton
                  onClick={goToRules}
                  deepLinkId={SecurityPageName.rules}
                  data-test-subj="manage-alert-detection-rules"
                  fill
                >
                  {i18n.BUTTON_MANAGE_RULES}
                </SecuritySolutionLinkButton>
              </HeaderPage>
              <EuiHorizontalRule margin="none" />
              <EuiSpacer size="l" />
              {AlertPageFilters}
              <EuiSpacer size="l" />
              <ChartPanels
                addFilter={addFilter}
                alertsHistogramDefaultFilters={alertsHistogramDefaultFilters}
                isLoadingIndexPattern={isChartPanelLoading}
                query={query}
                runtimeMappings={runtimeMappings}
                signalIndexName={signalIndexName}
                updateDateRangeCallback={updateDateRangeCallback}
              />

              <EuiSpacer size="l" />
            </Display>
            <AlertsTable
              tableId={TableId.alertsOnAlertsPage}
              loading={isAlertTableLoading}
              hasIndexWrite={hasIndexWrite ?? false}
              hasIndexMaintenance={hasIndexMaintenance ?? false}
              from={from}
              defaultFilters={alertsTableDefaultFilters}
              showBuildingBlockAlerts={showBuildingBlockAlerts}
              onShowBuildingBlockAlertsChanged={onShowBuildingBlockAlertsChangedCallback}
              showOnlyThreatIndicatorAlerts={showOnlyThreatIndicatorAlerts}
              onShowOnlyThreatIndicatorAlertsChanged={onShowOnlyThreatIndicatorAlertsCallback}
              to={to}
            />
          </SecuritySolutionPageWrapper>
        </StyledFullHeightContainer>
      ) : (
        <LandingPageComponent />
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
