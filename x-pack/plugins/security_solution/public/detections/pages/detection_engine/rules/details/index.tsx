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
  EuiBadge,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { noop } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import deepEqual from 'fast-deep-equal';

import {
  ExceptionListTypeEnum,
  ExceptionListIdentifiers,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  useDeepEqualSelector,
  useShallowEqualSelector,
} from '../../../../../common/hooks/use_selector';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
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
import { WrapperPage } from '../../../../../common/components/wrapper_page';
import { Rule, useRuleStatus, RuleInfoStatus } from '../../../../containers/detection_engine/rules';
import { useListsConfig } from '../../../../containers/detection_engine/lists/use_lists_config';
import { SpyRoute } from '../../../../../common/utils/route/spy_routes';
import { StepAboutRuleToggleDetails } from '../../../../components/rules/step_about_rule_details';
import { DetectionEngineHeaderPage } from '../../../../components/detection_engine_header_page';
import { AlertsHistogramPanel } from '../../../../components/alerts_histogram_panel';
import { AlertsHistogramOption } from '../../../../components/alerts_histogram_panel/types';
import { AlertsTable } from '../../../../components/alerts_table';
import { useUserData } from '../../../../components/user_info';
import { OverviewEmpty } from '../../../../../overview/components/overview_empty';
import { useAlertInfo } from '../../../../components/alerts_info';
import { StepDefineRule } from '../../../../components/rules/step_define_rule';
import { StepScheduleRule } from '../../../../components/rules/step_schedule_rule';
import {
  buildAlertsRuleIdFilter,
  buildShowBuildingBlockFilter,
  buildShowBuildingBlockFilterRuleRegistry,
  buildThreatMatchFilter,
} from '../../../../components/alerts_table/default_config';
import { RuleSwitch } from '../../../../components/rules/rule_switch';
import { StepPanel } from '../../../../components/rules/step_panel';
import { getStepsData, redirectToDetections, userHasPermissions } from '../helpers';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { alertsHistogramOptions } from '../../../../components/alerts_histogram_panel/config';
import { inputsSelectors } from '../../../../../common/store/inputs';
import { setAbsoluteRangeDatePicker } from '../../../../../common/store/inputs/actions';
import { RuleActionsOverflow } from '../../../../components/rules/rule_actions_overflow';
import { RuleStatusFailedCallOut } from './status_failed_callout';
import { FailureHistory } from './failure_history';
import { RuleStatus } from '../../../../components/rules//rule_status';
import { useMlCapabilities } from '../../../../../common/components/ml/hooks/use_ml_capabilities';
import { hasMlAdminPermissions } from '../../../../../../common/machine_learning/has_ml_admin_permissions';
import { hasMlLicense } from '../../../../../../common/machine_learning/has_ml_license';
import { SecurityPageName } from '../../../../../app/types';
import { LinkButton } from '../../../../../common/components/links';
import { useFormatUrl } from '../../../../../common/components/link_to';
import { ExceptionsViewer } from '../../../../../common/components/exceptions/viewer';
import { DEFAULT_INDEX_PATTERN } from '../../../../../../common/constants';
import { useGlobalFullScreen } from '../../../../../common/containers/use_full_screen';
import { Display } from '../../../../../hosts/pages/display';

import {
  focusUtilityBarAction,
  onTimelineTabKeyPressed,
  resetKeyboardFocus,
  showGlobalFilters,
} from '../../../../../timelines/components/timeline/helpers';
import { timelineSelectors } from '../../../../../timelines/store/timeline';
import { timelineDefaults } from '../../../../../timelines/store/timeline/defaults';
import { useSourcererScope } from '../../../../../common/containers/sourcerer';
import { SourcererScopeName } from '../../../../../common/store/sourcerer/model';
import {
  getToolTipContent,
  canEditRuleWithActions,
  isBoolean,
} from '../../../../../common/utils/privileges';

import * as detectionI18n from '../../translations';
import * as ruleI18n from '../translations';
import * as statusI18n from '../../../../components/rules/rule_status/translations';
import * as i18n from './translations';
import { isTab } from '../../../../../common/components/accessibility/helpers';
import { NeedAdminForUpdateRulesCallOut } from '../../../../components/callouts/need_admin_for_update_callout';
import { getRuleStatusText } from '../../../../../../common/detection_engine/utils';
import { MissingPrivilegesCallOut } from '../../../../components/callouts/missing_privileges_callout';
import { useRuleWithFallback } from '../../../../containers/detection_engine/rules/use_rule_with_fallback';

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

const RuleDetailsPageComponent = () => {
  const dispatch = useDispatch();
  const containerElement = useRef<HTMLDivElement | null>(null);
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const graphEventId = useShallowEqualSelector(
    (state) =>
      (getTimeline(state, TimelineId.detectionsRulesDetailsPage) ?? timelineDefaults).graphEventId
  );
  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

  const { to, from, deleteQuery, setQuery } = useGlobalTime();
  const [
    {
      loading: userInfoLoading,
      isSignalIndexExists,
      isAuthenticated,
      hasEncryptionKey,
      canUserCRUD,
      hasIndexWrite,
      hasIndexMaintenance,
      signalIndexName,
    },
  ] = useUserData();
  const {
    loading: listsConfigLoading,
    needsConfiguration: needsListsConfiguration,
  } = useListsConfig();
  const loading = userInfoLoading || listsConfigLoading;
  const { detailName: ruleId } = useParams<{ detailName: string }>();
  const {
    rule: maybeRule,
    refresh: refreshRule,
    loading: ruleLoading,
    isExistingRule,
  } = useRuleWithFallback(ruleId);
  const [loadingStatus, ruleStatus, fetchRuleStatus] = useRuleStatus(ruleId);
  const [currentStatus, setCurrentStatus] = useState<RuleInfoStatus | null>(
    ruleStatus?.current_status ?? null
  );
  useEffect(() => {
    if (!deepEqual(currentStatus, ruleStatus?.current_status)) {
      setCurrentStatus(ruleStatus?.current_status ?? null);
    }
  }, [currentStatus, ruleStatus, setCurrentStatus]);
  const [rule, setRule] = useState<Rule | null>(null);
  const isLoading = ruleLoading && rule == null;
  // This is used to re-trigger api rule status when user de/activate rule
  const [ruleEnabled, setRuleEnabled] = useState<boolean | null>(null);
  const [ruleDetailTab, setRuleDetailTab] = useState(RuleDetailTabs.alerts);
  const { aboutRuleData, modifiedAboutRuleDetailsData, defineRuleData, scheduleRuleData } =
    rule != null
      ? getStepsData({ rule, detailsView: true })
      : {
          aboutRuleData: null,
          modifiedAboutRuleDetailsData: null,
          defineRuleData: null,
          scheduleRuleData: null,
        };
  const [lastAlerts] = useAlertInfo({ ruleId });
  const [showBuildingBlockAlerts, setShowBuildingBlockAlerts] = useState(false);
  const [showOnlyThreatIndicatorAlerts, setShowOnlyThreatIndicatorAlerts] = useState(false);
  const mlCapabilities = useMlCapabilities();
  const history = useHistory();
  const { formatUrl } = useFormatUrl(SecurityPageName.detections);
  const { globalFullScreen } = useGlobalFullScreen();

  // TODO: Once we are past experimental phase this code should be removed
  const ruleRegistryEnabled = useIsExperimentalFeatureEnabled('ruleRegistryEnabled');

  // TODO: Refactor license check + hasMlAdminPermissions to common check
  const hasMlPermissions = hasMlLicense(mlCapabilities) && hasMlAdminPermissions(mlCapabilities);
  const {
    services: {
      application: {
        capabilities: { actions },
      },
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

  const title = useMemo(
    () => (
      <>
        {rule?.name}{' '}
        {ruleLoading ? (
          <EuiLoadingSpinner size="m" />
        ) : (
          !isExistingRule && <EuiBadge>{i18n.DELETED_RULE}</EuiBadge>
        )}
      </>
    ),
    [rule, ruleLoading, isExistingRule]
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

  // Set showBuildingBlockAlerts if rule is a Building Block Rule otherwise we won't show alerts
  useEffect(() => {
    setShowBuildingBlockAlerts(rule?.building_block_type != null);
  }, [rule]);

  const alertDefaultFilters = useMemo(
    () => [
      ...buildAlertsRuleIdFilter(ruleId),
      ...(ruleRegistryEnabled
        ? buildShowBuildingBlockFilterRuleRegistry(showBuildingBlockAlerts) // TODO: Once we are past experimental phase this code should be removed
        : buildShowBuildingBlockFilter(showBuildingBlockAlerts)),
      ...buildThreatMatchFilter(showOnlyThreatIndicatorAlerts),
    ],
    [ruleId, ruleRegistryEnabled, showBuildingBlockAlerts, showOnlyThreatIndicatorAlerts]
  );

  const alertMergedFilters = useMemo(() => [...alertDefaultFilters, ...filters], [
    alertDefaultFilters,
    filters,
  ]);

  const tabs = useMemo(
    () => (
      <EuiTabs>
        {ruleDetailTabs.map((tab) => (
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
    [ruleDetailTab, setRuleDetailTab]
  );

  const handleRefresh = useCallback(() => {
    if (fetchRuleStatus != null && ruleId != null) {
      fetchRuleStatus(ruleId);
    }
  }, [fetchRuleStatus, ruleId]);

  const ruleStatusInfo = useMemo(() => {
    return loadingStatus ? (
      <EuiFlexItem>
        <EuiLoadingSpinner size="m" data-test-subj="rule-status-loader" />
      </EuiFlexItem>
    ) : (
      <>
        <RuleStatus
          status={getRuleStatusText(currentStatus?.status)}
          statusDate={currentStatus?.status_date}
        >
          <EuiButtonIcon
            data-test-subj="refreshButton"
            color="primary"
            onClick={handleRefresh}
            iconType="refresh"
            aria-label={ruleI18n.REFRESH}
            isDisabled={!isExistingRule}
          />
        </RuleStatus>
      </>
    );
  }, [isExistingRule, currentStatus, loadingStatus, handleRefresh]);

  const ruleError = useMemo(() => {
    if (loadingStatus) {
      return (
        <EuiFlexItem>
          <EuiLoadingSpinner size="m" data-test-subj="rule-status-loader" />
        </EuiFlexItem>
      );
    } else if (
      currentStatus?.status === 'failed' &&
      ruleDetailTab === RuleDetailTabs.alerts &&
      currentStatus?.last_failure_at != null
    ) {
      return (
        <RuleStatusFailedCallOut
          message={currentStatus?.last_failure_message ?? ''}
          date={currentStatus?.last_failure_at}
        />
      );
    } else if (
      (currentStatus?.status === 'warning' || currentStatus?.status === 'partial failure') &&
      ruleDetailTab === RuleDetailTabs.alerts &&
      currentStatus?.last_success_at != null
    ) {
      return (
        <RuleStatusFailedCallOut
          message={currentStatus?.last_success_message ?? ''}
          date={currentStatus?.last_success_at}
          color="warning"
        />
      );
    }
    return null;
  }, [ruleDetailTab, currentStatus, loadingStatus]);

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

  const handleOnChangeEnabledRule = useCallback(
    (enabled: boolean) => {
      if (ruleEnabled == null || enabled !== ruleEnabled) {
        setRuleEnabled(enabled);
      }
    },
    [ruleEnabled, setRuleEnabled]
  );

  const goToEditRule = useCallback(
    (ev) => {
      ev.preventDefault();
      history.push(getEditRuleUrl(ruleId ?? ''));
    },
    [history, ruleId]
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

  const { indicesExist, indexPattern } = useSourcererScope(SourcererScopeName.detections);

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
    history.replace(getDetectionEngineUrl());
    return null;
  }

  const defaultRuleStackByOption: AlertsHistogramOption = {
    text: 'event.category',
    value: 'event.category',
  };

  return (
    <>
      <NeedAdminForUpdateRulesCallOut />
      <MissingPrivilegesCallOut />
      {indicesExist ? (
        <StyledFullHeightContainer onKeyDown={onKeyDown} ref={containerElement}>
          <EuiWindowEvent event="resize" handler={noop} />
          <FiltersGlobal show={showGlobalFilters({ globalFullScreen, graphEventId })}>
            <SiemSearchBar id="global" indexPattern={indexPattern} />
          </FiltersGlobal>

          <WrapperPage noPadding={globalFullScreen}>
            <Display show={!globalFullScreen}>
              <DetectionEngineHeaderPage
                backOptions={{
                  href: getRulesUrl(),
                  text: i18n.BACK_TO_RULES,
                  pageId: SecurityPageName.detections,
                  dataTestSubj: 'ruleDetailsBackToAllRules',
                }}
                border
                subtitle={subTitle}
                subtitle2={[
                  ...(lastAlerts != null
                    ? [
                        <>
                          {detectionI18n.LAST_ALERT}
                          {': '}
                          {lastAlerts}
                        </>,
                      ]
                    : []),
                  <>
                    <EuiFlexGroup gutterSize="xs" alignItems="center" justifyContent="flexStart">
                      <EuiFlexItem grow={false}>
                        {statusI18n.STATUS}
                        {':'}
                      </EuiFlexItem>
                      {ruleStatusInfo}
                    </EuiFlexGroup>
                  </>,
                ]}
                title={title}
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
                        <EuiFlexItem>{i18n.ACTIVATED_RULE}</EuiFlexItem>
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
              </DetectionEngineHeaderPage>
              {ruleError}
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
            {ruleDetailTab === RuleDetailTabs.alerts && (
              <>
                <Display show={!globalFullScreen}>
                  <AlertsHistogramPanel
                    deleteQuery={deleteQuery}
                    filters={alertMergedFilters}
                    query={query}
                    from={from}
                    signalIndexName={signalIndexName}
                    setQuery={setQuery}
                    stackByOptions={alertsHistogramOptions}
                    defaultStackByOption={defaultRuleStackByOption}
                    to={to}
                    updateDateRange={updateDateRangeCallback}
                  />
                  <EuiSpacer />
                </Display>
                {ruleId != null && (
                  <AlertsTable
                    timelineId={TimelineId.detectionsRulesDetailsPage}
                    defaultFilters={alertDefaultFilters}
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
                ruleIndices={rule?.index ?? DEFAULT_INDEX_PATTERN}
                availableListTypes={exceptionLists.allowedExceptionListTypes}
                commentsAccordionId={'ruleDetailsTabExceptions'}
                exceptionListsMeta={exceptionLists.lists}
                onRuleChange={refreshRule}
              />
            )}
            {ruleDetailTab === RuleDetailTabs.failures && <FailureHistory id={rule?.id} />}
          </WrapperPage>
        </StyledFullHeightContainer>
      ) : (
        <WrapperPage>
          <DetectionEngineHeaderPage border title={i18n.PAGE_TITLE} />

          <OverviewEmpty />
        </WrapperPage>
      )}

      <SpyRoute pageName={SecurityPageName.detections} state={{ ruleName: rule?.name }} />
    </>
  );
};

RuleDetailsPageComponent.displayName = 'RuleDetailsPageComponent';

export const RuleDetailsPage = React.memo(RuleDetailsPageComponent);

RuleDetailsPage.displayName = 'RuleDetailsPage';
