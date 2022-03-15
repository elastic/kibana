/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable complexity */
// TODO: Disabling complexity is temporary till this component is refactored as part of lists UI integration

import {
  EuiButtonIcon,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiToolTip,
  EuiWindowEvent,
} from '@elastic/eui';
import { i18n as i18nTranslate } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';
import { noop } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { connect, ConnectedProps, useDispatch } from 'react-redux';
import styled from 'styled-components';
import {
  ExceptionListTypeEnum,
  ExceptionListIdentifiers,
} from '@kbn/securitysolution-io-ts-list-types';

import { Dispatch } from 'redux';
import { isTab } from '../../../../../../../timelines/public';
import {
  useDeepEqualSelector,
  useShallowEqualSelector,
} from '../../../../../common/hooks/use_selector';
import { useKibana } from '../../../../../common/lib/kibana';
import { TimelineId } from '../../../../../../common/types/timeline';
import { UpdateDateRange } from '../../../../../common/components/charts/common';
import { FiltersGlobal } from '../../../../../common/components/filters_global';
import { FormattedDate } from '../../../../../common/components/formatted_date';
import {
  getEditRuleUrl,
  getRulesUrl,
  getDetectionEngineUrl,
} from '../../../../../common/components/link_to/redirect_to_detection_engine';
import { SiemSearchBar } from '../../../../../common/components/search_bar';
import { SecuritySolutionPageWrapper } from '../../../../../common/components/page_wrapper';
import { Rule } from '../../../../containers/detection_engine/rules';
import { useListsConfig } from '../../../../containers/detection_engine/lists/use_lists_config';
import { SpyRoute } from '../../../../../common/utils/route/spy_routes';
import { StepAboutRuleToggleDetails } from '../../../../components/rules/step_about_rule_details';
import { AlertsHistogramPanel } from '../../../../components/alerts_kpis/alerts_histogram_panel';
import { AlertsTable } from '../../../../components/alerts_table';
import { useUserData } from '../../../../components/user_info';
import { StepDefineRule } from '../../../../components/rules/step_define_rule';
import { StepScheduleRule } from '../../../../components/rules/step_schedule_rule';
import {
  buildAlertsFilter,
  buildAlertStatusFilter,
  buildShowBuildingBlockFilter,
  buildThreatMatchFilter,
} from '../../../../components/alerts_table/default_config';
import { RuleSwitch } from '../../../../components/rules/rule_switch';
import { StepPanel } from '../../../../components/rules/step_panel';
import { getStepsData, redirectToDetections, userHasPermissions } from '../helpers';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { inputsSelectors } from '../../../../../common/store/inputs';
import { setAbsoluteRangeDatePicker } from '../../../../../common/store/inputs/actions';
import { RuleActionsOverflow } from '../../../../components/rules/rule_actions_overflow';
import { useMlCapabilities } from '../../../../../common/components/ml/hooks/use_ml_capabilities';
import { hasMlAdminPermissions } from '../../../../../../common/machine_learning/has_ml_admin_permissions';
import { hasMlLicense } from '../../../../../../common/machine_learning/has_ml_license';
import { SecurityPageName } from '../../../../../app/types';
import { LinkButton } from '../../../../../common/components/links';
import { useFormatUrl } from '../../../../../common/components/link_to';
import { ExceptionsViewer } from '../../../../../common/components/exceptions/viewer';
import { APP_UI_ID, DEFAULT_INDEX_PATTERN } from '../../../../../../common/constants';
import { useGlobalFullScreen } from '../../../../../common/containers/use_full_screen';
import { Display } from '../../../../../hosts/pages/display';

import {
  focusUtilityBarAction,
  onTimelineTabKeyPressed,
  resetKeyboardFocus,
  showGlobalFilters,
} from '../../../../../timelines/components/timeline/helpers';
import { timelineActions, timelineSelectors } from '../../../../../timelines/store/timeline';
import { timelineDefaults } from '../../../../../timelines/store/timeline/defaults';
import { useSourcererDataView } from '../../../../../common/containers/sourcerer';
import { SourcererScopeName } from '../../../../../common/store/sourcerer/model';
import {
  getToolTipContent,
  canEditRuleWithActions,
  isBoolean,
} from '../../../../../common/utils/privileges';

import {
  RuleStatus,
  RuleStatusFailedCallOut,
  ruleStatusI18n,
} from '../../../../components/rules/rule_execution_status';
import { FailureHistory } from './failure_history';

import * as detectionI18n from '../../translations';
import * as ruleI18n from '../translations';
import * as i18n from './translations';
import { NeedAdminForUpdateRulesCallOut } from '../../../../components/callouts/need_admin_for_update_callout';
import { MissingPrivilegesCallOut } from '../../../../components/callouts/missing_privileges_callout';
import { useRuleWithFallback } from '../../../../containers/detection_engine/rules/use_rule_with_fallback';
import { BadgeOptions } from '../../../../../common/components/header_page/types';
import { AlertsStackByField } from '../../../../components/alerts_kpis/common/types';
import { Status } from '../../../../../../common/detection_engine/schemas/common/schemas';
import {
  AlertsTableFilterGroup,
  FILTER_OPEN,
} from '../../../../components/alerts_table/alerts_filter_group';
import { useSignalHelpers } from '../../../../../common/containers/sourcerer/use_signal_helpers';
import { HeaderPage } from '../../../../../common/components/header_page';

/**
 * Need a 100% height here to account for the graph/analyze tool, which sets no explicit height parameters, but fills the available space.
 */
const StyledFullHeightContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
`;

enum RuleDetailTabs {
  alerts = 'alerts',
  failures = 'failures',
  exceptions = 'exceptions',
}

const ruleDetailTabs = [
  {
    id: RuleDetailTabs.alerts,
    name: detectionI18n.ALERT,
    disabled: false,
    dataTestSubj: 'alertsTab',
  },
  {
    id: RuleDetailTabs.exceptions,
    name: i18n.EXCEPTIONS_TAB,
    disabled: false,
    dataTestSubj: 'exceptionsTab',
  },
  {
    id: RuleDetailTabs.failures,
    name: i18n.FAILURE_HISTORY_TAB,
    disabled: false,
    dataTestSubj: 'failureHistoryTab',
  },
];

type DetectionEngineComponentProps = PropsFromRedux;

const RuleDetailsPageComponent: React.FC<DetectionEngineComponentProps> = ({
  clearEventsDeleted,
  clearEventsLoading,
  clearSelected,
}) => {
  const { navigateToApp } = useKibana().services.application;
  const dispatch = useDispatch();
  const containerElement = useRef<HTMLDivElement | null>(null);
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const graphEventId = useShallowEqualSelector(
    (state) =>
      (getTimeline(state, TimelineId.detectionsRulesDetailsPage) ?? timelineDefaults).graphEventId
  );
  const updatedAt = useShallowEqualSelector(
    (state) =>
      (getTimeline(state, TimelineId.detectionsRulesDetailsPage) ?? timelineDefaults).updated
  );
  const isAlertsLoading = useShallowEqualSelector(
    (state) => (getTimeline(state, TimelineId.detectionsPage) ?? timelineDefaults).isLoading
  );
  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

  const { to, from } = useGlobalTime();
  const [
    {
      loading: userInfoLoading,
      isSignalIndexExists,
      isAuthenticated,
      hasEncryptionKey,
      canUserCRUD,
      hasIndexWrite,
      hasIndexRead,
      hasIndexMaintenance,
      signalIndexName,
    },
  ] = useUserData();
  const { loading: listsConfigLoading, needsConfiguration: needsListsConfiguration } =
    useListsConfig();

  const {
    indexPattern,
    runtimeMappings,
    loading: isLoadingIndexPattern,
  } = useSourcererDataView(SourcererScopeName.detections);

  const loading = userInfoLoading || listsConfigLoading;
  const { detailName: ruleId } = useParams<{ detailName: string }>();
  const {
    rule: maybeRule,
    refresh: refreshRule,
    loading: ruleLoading,
    isExistingRule,
  } = useRuleWithFallback(ruleId);
  const { pollForSignalIndex } = useSignalHelpers();
  const [rule, setRule] = useState<Rule | null>(null);
  const isLoading = ruleLoading && rule == null;
  const [ruleDetailTab, setRuleDetailTab] = useState(RuleDetailTabs.alerts);
  const [pageTabs, setTabs] = useState(ruleDetailTabs);
  const { aboutRuleData, modifiedAboutRuleDetailsData, defineRuleData, scheduleRuleData } =
    rule != null
      ? getStepsData({ rule, detailsView: true })
      : {
          aboutRuleData: null,
          modifiedAboutRuleDetailsData: null,
          defineRuleData: null,
          scheduleRuleData: null,
        };
  const [showBuildingBlockAlerts, setShowBuildingBlockAlerts] = useState(false);
  const [showOnlyThreatIndicatorAlerts, setShowOnlyThreatIndicatorAlerts] = useState(false);
  const mlCapabilities = useMlCapabilities();
  const { formatUrl } = useFormatUrl(SecurityPageName.rules);
  const { globalFullScreen } = useGlobalFullScreen();
  const [filterGroup, setFilterGroup] = useState<Status>(FILTER_OPEN);

  // TODO: Refactor license check + hasMlAdminPermissions to common check
  const hasMlPermissions = hasMlLicense(mlCapabilities) && hasMlAdminPermissions(mlCapabilities);
  const {
    services: {
      application: {
        capabilities: { actions },
      },
      timelines: timelinesUi,
      spaces: spacesApi,
    },
  } = useKibana();
  const hasActionsPrivileges = useMemo(() => {
    if (rule?.actions != null && rule?.actions.length > 0 && isBoolean(actions.show)) {
      return actions.show;
    }
    return true;
  }, [actions, rule?.actions]);

  // persist rule until refresh is complete
  useEffect(() => {
    if (maybeRule != null) {
      setRule(maybeRule);
    }
  }, [maybeRule]);

  useEffect(() => {
    if (rule) {
      const outcome = rule.outcome;
      if (spacesApi && outcome === 'aliasMatch') {
        // This rule has been resolved from a legacy URL - redirect the user to the new URL and display a toast.
        const path = `rules/id/${rule.id}${window.location.search}${window.location.hash}`;
        spacesApi.ui.redirectLegacyUrl(
          path,
          i18nTranslate.translate(
            'xpack.triggersActionsUI.sections.ruleDetails.redirectObjectNoun',
            {
              defaultMessage: 'rule',
            }
          )
        );
      }
    }
  }, [rule, spacesApi]);

  const getLegacyUrlConflictCallout = useMemo(() => {
    if (rule?.alias_target_id != null && spacesApi && rule.outcome === 'conflict') {
      const aliasTargetId = rule.alias_target_id;
      // We have resolved to one rule, but there is another one with a legacy URL associated with this page. Display a
      // callout with a warning for the user, and provide a way for them to navigate to the other rule.
      const otherRulePath = `rules/id/${aliasTargetId}${window.location.search}${window.location.hash}`;
      return (
        <>
          <EuiSpacer />
          {spacesApi.ui.components.getLegacyUrlConflict({
            objectNoun: i18nTranslate.translate(
              'xpack.triggersActionsUI.sections.ruleDetails.redirectObjectNoun',
              {
                defaultMessage: 'rule',
              }
            ),
            currentObjectId: rule.id,
            otherObjectId: aliasTargetId,
            otherObjectPath: otherRulePath,
          })}
        </>
      );
    }
    return null;
  }, [rule, spacesApi]);

  useEffect(() => {
    if (!hasIndexRead) {
      setTabs(ruleDetailTabs.filter(({ id }) => id !== RuleDetailTabs.alerts));
      setRuleDetailTab(RuleDetailTabs.exceptions);
    } else {
      setTabs(ruleDetailTabs);
      setRuleDetailTab(RuleDetailTabs.alerts);
    }
  }, [hasIndexRead]);

  const showUpdating = useMemo(
    () => isLoadingIndexPattern || isAlertsLoading || loading,
    [isLoadingIndexPattern, isAlertsLoading, loading]
  );

  const title = useMemo(
    () => (
      <>
        {rule?.name} {ruleLoading && <EuiLoadingSpinner size="m" />}
      </>
    ),
    [rule, ruleLoading]
  );
  const badgeOptions = useMemo<BadgeOptions | undefined>(
    () =>
      !ruleLoading && !isExistingRule
        ? {
            text: i18n.DELETED_RULE,
            color: 'default',
          }
        : undefined,
    [isExistingRule, ruleLoading]
  );
  const subTitle = useMemo(
    () =>
      rule ? (
        [
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.ruleDetails.ruleCreationDescription"
            defaultMessage="Created by: {by} on {date}"
            values={{
              by: rule?.created_by ?? i18n.UNKNOWN,
              date: (
                <FormattedDate
                  value={rule?.created_at ?? new Date().toISOString()}
                  fieldName="createdAt"
                />
              ),
            }}
          />,
          rule?.updated_by != null ? (
            <FormattedMessage
              id="xpack.securitySolution.detectionEngine.ruleDetails.ruleUpdateDescription"
              defaultMessage="Updated by: {by} on {date}"
              values={{
                by: rule?.updated_by ?? i18n.UNKNOWN,
                date: (
                  <FormattedDate
                    value={rule?.updated_at ?? new Date().toISOString()}
                    fieldName="updatedAt"
                  />
                ),
              }}
            />
          ) : (
            ''
          ),
        ]
      ) : ruleLoading ? (
        <EuiLoadingSpinner size="m" />
      ) : null,
    [rule, ruleLoading]
  );

  // Callback for when open/closed filter changes
  const onFilterGroupChangedCallback = useCallback(
    (newFilterGroup: Status) => {
      const timelineId = TimelineId.detectionsRulesDetailsPage;
      clearEventsLoading({ id: timelineId });
      clearEventsDeleted({ id: timelineId });
      clearSelected({ id: timelineId });
      setFilterGroup(newFilterGroup);
    },
    [clearEventsLoading, clearEventsDeleted, clearSelected, setFilterGroup]
  );

  // Set showBuildingBlockAlerts if rule is a Building Block Rule otherwise we won't show alerts
  useEffect(() => {
    setShowBuildingBlockAlerts(rule?.building_block_type != null);
  }, [rule]);

  const alertDefaultFilters = useMemo(
    () => [
      ...buildAlertsFilter(rule?.rule_id ?? ''),
      ...buildShowBuildingBlockFilter(showBuildingBlockAlerts),
      ...buildAlertStatusFilter(filterGroup),
      ...buildThreatMatchFilter(showOnlyThreatIndicatorAlerts),
    ],
    [rule, showBuildingBlockAlerts, showOnlyThreatIndicatorAlerts, filterGroup]
  );

  const alertsTableDefaultFilters = useMemo(
    () => [
      ...buildAlertsFilter(rule?.rule_id ?? ''),
      ...buildShowBuildingBlockFilter(showBuildingBlockAlerts),
      ...buildThreatMatchFilter(showOnlyThreatIndicatorAlerts),
    ],
    [rule, showBuildingBlockAlerts, showOnlyThreatIndicatorAlerts]
  );

  const alertMergedFilters = useMemo(
    () => [...alertDefaultFilters, ...filters],
    [alertDefaultFilters, filters]
  );

  const tabs = useMemo(
    () => (
      <EuiTabs>
        {pageTabs.map((tab) => (
          <EuiTab
            onClick={() => setRuleDetailTab(tab.id)}
            isSelected={tab.id === ruleDetailTab}
            disabled={tab.disabled}
            key={tab.id}
            data-test-subj={tab.dataTestSubj}
          >
            {tab.name}
          </EuiTab>
        ))}
      </EuiTabs>
    ),
    [ruleDetailTab, setRuleDetailTab, pageTabs]
  );
  const ruleIndices = useMemo(() => rule?.index ?? DEFAULT_INDEX_PATTERN, [rule?.index]);

  const lastExecution = rule?.execution_summary?.last_execution;
  const lastExecutionStatus = lastExecution?.status;
  const lastExecutionDate = lastExecution?.date ?? '';
  const lastExecutionMessage = lastExecution?.message ?? '';

  const ruleStatusInfo = useMemo(() => {
    return ruleLoading ? (
      <EuiFlexItem>
        <EuiLoadingSpinner size="m" data-test-subj="rule-status-loader" />
      </EuiFlexItem>
    ) : (
      <RuleStatus status={lastExecutionStatus} date={lastExecutionDate}>
        <EuiButtonIcon
          data-test-subj="refreshButton"
          color="primary"
          onClick={refreshRule}
          iconType="refresh"
          aria-label={ruleI18n.REFRESH}
          isDisabled={!isExistingRule}
        />
      </RuleStatus>
    );
  }, [lastExecutionStatus, lastExecutionDate, ruleLoading, isExistingRule, refreshRule]);

  const ruleError = useMemo(() => {
    return ruleLoading ? (
      <EuiFlexItem>
        <EuiLoadingSpinner size="m" data-test-subj="rule-status-loader" />
      </EuiFlexItem>
    ) : (
      <RuleStatusFailedCallOut
        status={lastExecutionStatus}
        date={lastExecutionDate}
        message={lastExecutionMessage}
      />
    );
  }, [lastExecutionStatus, lastExecutionDate, lastExecutionMessage, ruleLoading]);

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

  const handleOnChangeEnabledRule = useCallback((enabled: boolean) => {
    setRule((currentRule) => (currentRule ? { ...currentRule, enabled } : currentRule));
  }, []);

  const goToEditRule = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.rules,
        path: getEditRuleUrl(ruleId ?? ''),
      });
    },
    [navigateToApp, ruleId]
  );

  const editRule = useMemo(() => {
    if (!hasActionsPrivileges) {
      return (
        <EuiToolTip position="top" content={ruleI18n.EDIT_RULE_SETTINGS_TOOLTIP}>
          <LinkButton
            onClick={goToEditRule}
            iconType="controlsHorizontal"
            isDisabled={true}
            href={formatUrl(getEditRuleUrl(ruleId ?? ''))}
          >
            {ruleI18n.EDIT_RULE_SETTINGS}
          </LinkButton>
        </EuiToolTip>
      );
    }
    return (
      <LinkButton
        onClick={goToEditRule}
        iconType="controlsHorizontal"
        isDisabled={!isExistingRule || !userHasPermissions(canUserCRUD)}
        href={formatUrl(getEditRuleUrl(ruleId ?? ''))}
      >
        {ruleI18n.EDIT_RULE_SETTINGS}
      </LinkButton>
    );
  }, [isExistingRule, canUserCRUD, formatUrl, goToEditRule, hasActionsPrivileges, ruleId]);

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

  const exceptionLists = useMemo((): {
    lists: ExceptionListIdentifiers[];
    allowedExceptionListTypes: ExceptionListTypeEnum[];
  } => {
    if (rule != null && rule.exceptions_list != null) {
      return rule.exceptions_list.reduce<{
        lists: ExceptionListIdentifiers[];
        allowedExceptionListTypes: ExceptionListTypeEnum[];
      }>(
        (acc, { id, list_id: listId, namespace_type: namespaceType, type }) => {
          const { allowedExceptionListTypes, lists } = acc;
          const shouldAddEndpoint =
            type === ExceptionListTypeEnum.ENDPOINT &&
            !allowedExceptionListTypes.includes(ExceptionListTypeEnum.ENDPOINT);
          return {
            lists: [...lists, { id, listId, namespaceType, type }],
            allowedExceptionListTypes: shouldAddEndpoint
              ? [...allowedExceptionListTypes, ExceptionListTypeEnum.ENDPOINT]
              : allowedExceptionListTypes,
          };
        },
        { lists: [], allowedExceptionListTypes: [ExceptionListTypeEnum.DETECTION] }
      );
    } else {
      return { lists: [], allowedExceptionListTypes: [ExceptionListTypeEnum.DETECTION] };
    }
  }, [rule]);

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

  if (
    redirectToDetections(
      isSignalIndexExists,
      isAuthenticated,
      hasEncryptionKey,
      needsListsConfiguration
    )
  ) {
    navigateToApp(APP_UI_ID, {
      deepLinkId: SecurityPageName.alerts,
      path: getDetectionEngineUrl(),
    });
    return null;
  }

  const defaultRuleStackByOption: AlertsStackByField = 'event.category';

  return (
    <>
      <NeedAdminForUpdateRulesCallOut />
      <MissingPrivilegesCallOut />
      <StyledFullHeightContainer onKeyDown={onKeyDown} ref={containerElement}>
        <EuiWindowEvent event="resize" handler={noop} />
        <FiltersGlobal show={showGlobalFilters({ globalFullScreen, graphEventId })}>
          <SiemSearchBar
            id="global"
            pollForSignalIndex={pollForSignalIndex}
            indexPattern={indexPattern}
          />
        </FiltersGlobal>

        <SecuritySolutionPageWrapper noPadding={globalFullScreen}>
          <Display show={!globalFullScreen}>
            <HeaderPage
              backOptions={{
                path: getRulesUrl(),
                text: i18n.BACK_TO_RULES,
                pageId: SecurityPageName.rules,
                dataTestSubj: 'ruleDetailsBackToAllRules',
              }}
              border
              subtitle={subTitle}
              subtitle2={
                <>
                  <EuiFlexGroup gutterSize="xs" alignItems="center" justifyContent="flexStart">
                    <EuiFlexItem grow={false}>
                      {ruleStatusI18n.STATUS}
                      {':'}
                    </EuiFlexItem>
                    {ruleStatusInfo}
                  </EuiFlexGroup>
                </>
              }
              title={title}
              badgeOptions={badgeOptions}
            >
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    position="top"
                    content={getToolTipContent(rule, hasMlPermissions, hasActionsPrivileges)}
                  >
                    <EuiFlexGroup>
                      <RuleSwitch
                        id={rule?.id ?? '-1'}
                        isDisabled={
                          !isExistingRule ||
                          !canEditRuleWithActions(rule, hasActionsPrivileges) ||
                          !userHasPermissions(canUserCRUD) ||
                          (!hasMlPermissions && !rule?.enabled)
                        }
                        enabled={isExistingRule && (rule?.enabled ?? false)}
                        onChange={handleOnChangeEnabledRule}
                      />
                      <EuiFlexItem>{i18n.ENABLE_RULE}</EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiToolTip>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                    <EuiFlexItem grow={false}>{editRule}</EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <RuleActionsOverflow
                        rule={rule}
                        userHasPermissions={isExistingRule && userHasPermissions(canUserCRUD)}
                        canDuplicateRuleWithActions={canEditRuleWithActions(
                          rule,
                          hasActionsPrivileges
                        )}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </HeaderPage>
            {ruleError}
            {getLegacyUrlConflictCallout}
            <EuiSpacer />
            <EuiFlexGroup>
              <EuiFlexItem data-test-subj="aboutRule" component="section" grow={1}>
                <StepAboutRuleToggleDetails
                  loading={isLoading}
                  stepData={aboutRuleData}
                  stepDataDetails={modifiedAboutRuleDetailsData}
                />
              </EuiFlexItem>

              <EuiFlexItem grow={1}>
                <EuiFlexGroup direction="column">
                  <EuiFlexItem component="section" grow={1}>
                    <StepPanel loading={isLoading} title={ruleI18n.DEFINITION}>
                      {defineRuleData != null && (
                        <StepDefineRule
                          descriptionColumns="singleSplit"
                          isReadOnlyView={true}
                          isLoading={false}
                          defaultValues={defineRuleData}
                        />
                      )}
                    </StepPanel>
                  </EuiFlexItem>
                  <EuiSpacer />
                  <EuiFlexItem data-test-subj="schedule" component="section" grow={1}>
                    <StepPanel loading={isLoading} title={ruleI18n.SCHEDULE}>
                      {scheduleRuleData != null && (
                        <StepScheduleRule
                          descriptionColumns="singleSplit"
                          isReadOnlyView={true}
                          isLoading={false}
                          defaultValues={scheduleRuleData}
                        />
                      )}
                    </StepPanel>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer />
            {tabs}
            <EuiSpacer />
          </Display>
          {ruleDetailTab === RuleDetailTabs.alerts && hasIndexRead && (
            <>
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <AlertsTableFilterGroup
                    status={filterGroup}
                    onFilterGroupChanged={onFilterGroupChangedCallback}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  {updatedAt &&
                    timelinesUi.getLastUpdated({
                      updatedAt: updatedAt || Date.now(),
                      showUpdating,
                    })}
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="l" />
              <Display show={!globalFullScreen}>
                <AlertsHistogramPanel
                  filters={alertMergedFilters}
                  query={query}
                  signalIndexName={signalIndexName}
                  defaultStackByOption={defaultRuleStackByOption}
                  updateDateRange={updateDateRangeCallback}
                  runtimeMappings={runtimeMappings}
                />
                <EuiSpacer />
              </Display>
              {ruleId != null && (
                <AlertsTable
                  filterGroup={filterGroup}
                  timelineId={TimelineId.detectionsRulesDetailsPage}
                  defaultFilters={alertsTableDefaultFilters}
                  hasIndexWrite={hasIndexWrite ?? false}
                  hasIndexMaintenance={hasIndexMaintenance ?? false}
                  from={from}
                  loading={loading}
                  showBuildingBlockAlerts={showBuildingBlockAlerts}
                  showOnlyThreatIndicatorAlerts={showOnlyThreatIndicatorAlerts}
                  onShowBuildingBlockAlertsChanged={onShowBuildingBlockAlertsChangedCallback}
                  onShowOnlyThreatIndicatorAlertsChanged={onShowOnlyThreatIndicatorAlertsCallback}
                  onRuleChange={refreshRule}
                  to={to}
                />
              )}
            </>
          )}
          {ruleDetailTab === RuleDetailTabs.exceptions && (
            <ExceptionsViewer
              ruleId={ruleId ?? ''}
              ruleName={rule?.name ?? ''}
              ruleIndices={ruleIndices}
              availableListTypes={exceptionLists.allowedExceptionListTypes}
              commentsAccordionId={'ruleDetailsTabExceptions'}
              exceptionListsMeta={exceptionLists.lists}
              onRuleChange={refreshRule}
            />
          )}
          {ruleDetailTab === RuleDetailTabs.failures && <FailureHistory ruleId={ruleId} />}
        </SecuritySolutionPageWrapper>
      </StyledFullHeightContainer>

      <SpyRoute pageName={SecurityPageName.rules} state={{ ruleName: rule?.name }} />
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

RuleDetailsPageComponent.displayName = 'RuleDetailsPageComponent';

export const RuleDetailsPage = connector(React.memo(RuleDetailsPageComponent));

RuleDetailsPage.displayName = 'RuleDetailsPage';
