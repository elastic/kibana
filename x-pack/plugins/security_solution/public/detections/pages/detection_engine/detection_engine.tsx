/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiWindowEvent,
  EuiHorizontalRule,
} from '@elastic/eui';
import styled from 'styled-components';
import { noop } from 'lodash/fp';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { connect, ConnectedProps, useDispatch } from 'react-redux';
import { Dispatch } from 'redux';
import { AlertsFeatureNoPermissions } from '@kbn/alerts';

import { Status } from '../../../../common/detection_engine/schemas/common/schemas';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { isTab } from '../../../../../timelines/public';
import { useDeepEqualSelector, useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { SecurityPageName } from '../../../app/types';
import { TimelineId } from '../../../../common/types/timeline';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { UpdateDateRange } from '../../../common/components/charts/common';
import { FiltersGlobal } from '../../../common/components/filters_global';
import { getRulesUrl } from '../../../common/components/link_to/redirect_to_detection_engine';
import { SiemSearchBar } from '../../../common/components/search_bar';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { inputsSelectors } from '../../../common/store/inputs';
import { setAbsoluteRangeDatePicker } from '../../../common/store/inputs/actions';
import { AlertsTable } from '../../components/alerts_table';
import { NoApiIntegrationKeyCallOut } from '../../components/callouts/no_api_integration_callout';
import { AlertsHistogramPanel } from '../../components/alerts_kpis/alerts_histogram_panel';
import { useUserData } from '../../components/user_info';
import { OverviewEmpty } from '../../../overview/components/overview_empty';
import { DetectionEngineNoIndex } from './detection_engine_no_index';
import { DetectionEngineHeaderPage } from '../../components/detection_engine_header_page';
import { useListsConfig } from '../../containers/detection_engine/lists/use_lists_config';
import { DetectionEngineUserUnauthenticated } from './detection_engine_user_unauthenticated';
import * as i18n from './translations';
import { LinkAnchor } from '../../../common/components/links';
import { useFormatUrl } from '../../../common/components/link_to';
import { useGlobalFullScreen } from '../../../common/containers/use_full_screen';
import { Display } from '../../../hosts/pages/display';
import {
  focusUtilityBarAction,
  onTimelineTabKeyPressed,
  resetKeyboardFocus,
  showGlobalFilters,
} from '../../../timelines/components/timeline/helpers';
import { timelineActions, timelineSelectors } from '../../../timelines/store/timeline';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';
import {
  buildAlertStatusFilter,
  buildAlertStatusFilterRuleRegistry,
  buildShowBuildingBlockFilter,
  buildShowBuildingBlockFilterRuleRegistry,
  buildThreatMatchFilter,
} from '../../components/alerts_table/default_config';
import { useSourcererScope } from '../../../common/containers/sourcerer';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { NeedAdminForUpdateRulesCallOut } from '../../components/callouts/need_admin_for_update_callout';
import { MissingPrivilegesCallOut } from '../../components/callouts/missing_privileges_callout';
import { useKibana } from '../../../common/lib/kibana';
import { AlertsCountPanel } from '../../components/alerts_kpis/alerts_count_panel';
import { CHART_HEIGHT } from '../../components/alerts_kpis/common/config';
import {
  AlertsTableFilterGroup,
  FILTER_OPEN,
} from '../../components/alerts_table/alerts_filter_group';

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
  clearEventsDeleted,
  clearEventsLoading,
  clearSelected,
}) => {
  const dispatch = useDispatch();
  const containerElement = useRef<HTMLDivElement | null>(null);
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const graphEventId = useShallowEqualSelector(
    (state) => (getTimeline(state, TimelineId.detectionsPage) ?? timelineDefaults).graphEventId
  );
  const updatedAt = useShallowEqualSelector(
    (state) => (getTimeline(state, TimelineId.detectionsPage) ?? timelineDefaults).updated
  );
  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);
  // TODO: Once we are past experimental phase this code should be removed
  const ruleRegistryEnabled = useIsExperimentalFeatureEnabled('ruleRegistryEnabled');

  const { to, from } = useGlobalTime();
  const { globalFullScreen } = useGlobalFullScreen();
  const [
    {
      loading: userInfoLoading,
      isAuthenticated: isUserAuthenticated,
      hasEncryptionKey,
      signalIndexName,
      hasIndexWrite,
      hasIndexRead,
    },
  ] = useUserData();
  const {
    loading: listsConfigLoading,
    needsConfiguration: needsListsConfiguration,
  } = useListsConfig();
  const { formatUrl } = useFormatUrl(SecurityPageName.rules);
  const [showBuildingBlockAlerts, setShowBuildingBlockAlerts] = useState(false);
  const [showOnlyThreatIndicatorAlerts, setShowOnlyThreatIndicatorAlerts] = useState(false);
  const loading = userInfoLoading || listsConfigLoading;
  const {
    application: { navigateToUrl },
    timelines: timelinesUi,
    docLinks,
  } = useKibana().services;
  const [filterGroup, setFilterGroup] = useState<Status>(FILTER_OPEN);

  const updateDateRangeCallback = useCallback<UpdateDateRange>(
    ({ x }) => {
      if (!x) {
        return;
      }
      const [min, max] = x;
      dispatch(
        setAbsoluteRangeDatePicker({
          id: 'global',
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

  // Callback for when open/closed filter changes
  const onFilterGroupChangedCallback = useCallback(
    (newFilterGroup: Status) => {
      const timelineId = TimelineId.detectionsPage;
      clearEventsLoading!({ id: timelineId });
      clearEventsDeleted!({ id: timelineId });
      clearSelected!({ id: timelineId });
      setFilterGroup(newFilterGroup);
    },
    [clearEventsLoading, clearEventsDeleted, clearSelected, setFilterGroup]
  );

  const alertsHistogramDefaultFilters = useMemo(
    () => [
      ...filters,
      ...(ruleRegistryEnabled
        ? [
            // TODO: Once we are past experimental phase this code should be removed
            ...buildShowBuildingBlockFilterRuleRegistry(showBuildingBlockAlerts),
            ...buildAlertStatusFilterRuleRegistry(filterGroup),
          ]
        : [
            ...buildShowBuildingBlockFilter(showBuildingBlockAlerts),
            ...buildAlertStatusFilter(filterGroup),
          ]),
      ...buildThreatMatchFilter(showOnlyThreatIndicatorAlerts),
    ],
    [
      filters,
      ruleRegistryEnabled,
      showBuildingBlockAlerts,
      showOnlyThreatIndicatorAlerts,
      filterGroup,
    ]
  );

  // AlertsTable manages global filters itself, so not including `filters`
  const alertsTableDefaultFilters = useMemo(
    () => [
      ...(ruleRegistryEnabled
        ? [
            // TODO: Once we are past experimental phase this code should be removed
            ...buildShowBuildingBlockFilterRuleRegistry(showBuildingBlockAlerts),
          ]
        : [...buildShowBuildingBlockFilter(showBuildingBlockAlerts)]),
      ...buildThreatMatchFilter(showOnlyThreatIndicatorAlerts),
    ],
    [ruleRegistryEnabled, showBuildingBlockAlerts, showOnlyThreatIndicatorAlerts]
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

  const { indicesExist, indexPattern } = useSourcererScope(SourcererScopeName.detections);

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

  if (isUserAuthenticated != null && !isUserAuthenticated && !loading) {
    return (
      <SecuritySolutionPageWrapper>
        <DetectionEngineHeaderPage border title={i18n.PAGE_TITLE} />
        <DetectionEngineUserUnauthenticated />
      </SecuritySolutionPageWrapper>
    );
  }

  if (!loading && (indicesExist === false || needsListsConfiguration)) {
    return (
      <SecuritySolutionPageWrapper>
        <DetectionEngineHeaderPage border title={i18n.PAGE_TITLE} />
        <DetectionEngineNoIndex
          needsSignalsIndex={indicesExist === false}
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
      {indicesExist ? (
        <StyledFullHeightContainer onKeyDown={onKeyDown} ref={containerElement}>
          <EuiWindowEvent event="resize" handler={noop} />
          {hasIndexRead ? (
            <>
              <FiltersGlobal show={showGlobalFilters({ globalFullScreen, graphEventId })}>
                <SiemSearchBar id="global" indexPattern={indexPattern} />
              </FiltersGlobal>
              <SecuritySolutionPageWrapper
                noPadding={globalFullScreen}
                data-test-subj="detectionsAlertsPage"
              >
                <Display show={!globalFullScreen}>
                  <DetectionEngineHeaderPage title={i18n.PAGE_TITLE}>
                    <LinkAnchor
                      onClick={goToRules}
                      href={formatUrl(getRulesUrl())}
                      data-test-subj="manage-alert-detection-rules"
                    >
                      {i18n.BUTTON_MANAGE_RULES}
                    </LinkAnchor>
                  </DetectionEngineHeaderPage>
                  <EuiHorizontalRule margin="m" />
                  <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                    <EuiFlexItem grow={false}>
                      <AlertsTableFilterGroup
                        status={filterGroup}
                        onFilterGroupChanged={onFilterGroupChangedCallback}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      {timelinesUi.getLastUpdated({
                        updatedAt: updatedAt || 0,
                        showUpdating: loading,
                      })}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiSpacer size="m" />
                  <EuiFlexGroup wrap>
                    <EuiFlexItem grow={2}>
                      <AlertsHistogramPanel
                        chartHeight={CHART_HEIGHT}
                        filters={alertsHistogramDefaultFilters}
                        query={query}
                        showTotalAlertsCount={false}
                        titleSize={'s'}
                        signalIndexName={signalIndexName}
                        updateDateRange={updateDateRangeCallback}
                      />
                    </EuiFlexItem>

                    <EuiFlexItem grow={1}>
                      <AlertsCountPanel
                        filters={alertsHistogramDefaultFilters}
                        query={query}
                        signalIndexName={signalIndexName}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>

                  <EuiSpacer size="l" />
                </Display>

                <AlertsTable
                  timelineId={TimelineId.detectionsPage}
                  loading={loading}
                  hasIndexWrite={hasIndexWrite ?? false}
                  hasIndexMaintenance={hasIndexWrite ?? false}
                  from={from}
                  defaultFilters={alertsTableDefaultFilters}
                  showBuildingBlockAlerts={showBuildingBlockAlerts}
                  onShowBuildingBlockAlertsChanged={onShowBuildingBlockAlertsChangedCallback}
                  showOnlyThreatIndicatorAlerts={showOnlyThreatIndicatorAlerts}
                  onShowOnlyThreatIndicatorAlertsChanged={onShowOnlyThreatIndicatorAlertsCallback}
                  to={to}
                  filterGroup={filterGroup}
                />
              </SecuritySolutionPageWrapper>
            </>
          ) : (
            <AlertsFeatureNoPermissions
              data-test-subj="alertsNoPermissions"
              documentationUrl={`${docLinks.links.siem.gettingStarted}`}
              iconType="logoSecurity"
            />
          )}
        </StyledFullHeightContainer>
      ) : (
        <SecuritySolutionPageWrapper>
          <DetectionEngineHeaderPage border title={i18n.PAGE_TITLE} />
          <OverviewEmpty />
        </SecuritySolutionPageWrapper>
      )}
    </>
  );
};

const mapDispatchToProps = (dispatch: Dispatch) => ({
  clearSelected: ({ id }: { id: string }) => dispatch(timelineActions.clearSelected({ id })),
  clearEventsLoading: ({ id }: { id: string }) =>
    dispatch(timelineActions.clearEventsLoading({ id })),
  clearEventsDeleted: ({ id }: { id: string }) =>
    dispatch(timelineActions.clearEventsDeleted({ id })),
});

const connector = connect(null, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const DetectionEnginePage = connector(React.memo(DetectionEnginePageComponent));
