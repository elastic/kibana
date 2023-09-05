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
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiToolTip,
  EuiWindowEvent,
} from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import { Routes, Route } from '@kbn/shared-ux-router';

import { noop } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { ConnectedProps } from 'react-redux';
import { connect, useDispatch } from 'react-redux';
import styled from 'styled-components';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import type { Dispatch } from 'redux';
import { isTab } from '@kbn/timelines-plugin/public';

import {
  tableDefaults,
  dataTableActions,
  dataTableSelectors,
  FILTER_OPEN,
  TableId,
} from '@kbn/securitysolution-data-table';
import { AlertsTableComponent } from '../../../../detections/components/alerts_table';
import { GroupedAlertsTable } from '../../../../detections/components/alerts_table/alerts_grouping';
import { useDataTableFilters } from '../../../../common/hooks/use_data_table_filters';
import { isMlRule } from '../../../../../common/machine_learning/helpers';
import { TabNavigation } from '../../../../common/components/navigation/tab_navigation';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import {
  useDeepEqualSelector,
  useShallowEqualSelector,
} from '../../../../common/hooks/use_selector';
import { useKibana } from '../../../../common/lib/kibana';
import type { UpdateDateRange } from '../../../../common/components/charts/common';
import { FiltersGlobal } from '../../../../common/components/filters_global';
import {
  getDetectionEngineUrl,
  getRuleDetailsTabUrl,
} from '../../../../common/components/link_to/redirect_to_detection_engine';
import { SiemSearchBar } from '../../../../common/components/search_bar';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import type { Rule } from '../../../rule_management/logic';
import { useListsConfig } from '../../../../detections/containers/detection_engine/lists/use_lists_config';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { StepAboutRuleToggleDetails } from '../../../../detections/components/rules/step_about_rule_details';
import { AlertsHistogramPanel } from '../../../../detections/components/alerts_kpis/alerts_histogram_panel';
import { useUserData } from '../../../../detections/components/user_info';
import { StepDefineRuleReadOnly } from '../../../../detections/components/rules/step_define_rule';
import { StepScheduleRuleReadOnly } from '../../../../detections/components/rules/step_schedule_rule';
import { StepRuleActionsReadOnly } from '../../../../detections/components/rules/step_rule_actions';
import {
  buildAlertsFilter,
  buildAlertStatusFilter,
  buildShowBuildingBlockFilter,
  buildThreatMatchFilter,
} from '../../../../detections/components/alerts_table/default_config';
import { RuleSwitch } from '../../../../detections/components/rules/rule_switch';
import { StepPanel } from '../../../../detections/components/rules/step_panel';
import {
  getStepsData,
  redirectToDetections,
} from '../../../../detections/pages/detection_engine/rules/helpers';
import { CreatedBy, UpdatedBy } from '../../../../detections/components/rules/rule_info';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { inputsSelectors } from '../../../../common/store/inputs';
import { setAbsoluteRangeDatePicker } from '../../../../common/store/inputs/actions';
import { RuleActionsOverflow } from '../../../../detections/components/rules/rule_actions_overflow';
import { useMlCapabilities } from '../../../../common/components/ml/hooks/use_ml_capabilities';
import { hasMlAdminPermissions } from '../../../../../common/machine_learning/has_ml_admin_permissions';
import { hasMlLicense } from '../../../../../common/machine_learning/has_ml_license';
import { SecurityPageName } from '../../../../app/types';
import { ALERTS_TABLE_REGISTRY_CONFIG_IDS, APP_UI_ID } from '../../../../../common/constants';
import { useGlobalFullScreen } from '../../../../common/containers/use_full_screen';
import { Display } from '../../../../explore/hosts/pages/display';

import {
  focusUtilityBarAction,
  onTimelineTabKeyPressed,
  resetKeyboardFocus,
  showGlobalFilters,
} from '../../../../timelines/components/timeline/helpers';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import {
  explainLackOfPermission,
  canEditRuleWithActions,
  isBoolean,
  hasUserCRUDPermission,
} from '../../../../common/utils/privileges';

import {
  RuleStatus,
  RuleStatusFailedCallOut,
  ruleStatusI18n,
} from '../../../../detections/components/rules/rule_execution_status';
import { ExecutionEventsTable } from '../../../rule_monitoring';
import { ExecutionLogTable } from './execution_log_table/execution_log_table';

import * as ruleI18n from '../../../../detections/pages/detection_engine/rules/translations';

import { RuleDetailsContextProvider } from './rule_details_context';
// eslint-disable-next-line no-restricted-imports
import { LegacyUrlConflictCallOut } from './legacy_url_conflict_callout';
import { useGetSavedQuery } from '../../../../detections/pages/detection_engine/rules/use_get_saved_query';
import * as i18n from './translations';
import { NeedAdminForUpdateRulesCallOut } from '../../../../detections/components/callouts/need_admin_for_update_callout';
import { MissingPrivilegesCallOut } from '../../../../detections/components/callouts/missing_privileges_callout';
import { useRuleWithFallback } from '../../../rule_management/logic/use_rule_with_fallback';
import type { BadgeOptions } from '../../../../common/components/header_page/types';
import type { AlertsStackByField } from '../../../../detections/components/alerts_kpis/common/types';
import type { Status } from '../../../../../common/api/detection_engine';
import { AlertsTableFilterGroup } from '../../../../detections/components/alerts_table/alerts_filter_group';
import { useSignalHelpers } from '../../../../common/containers/sourcerer/use_signal_helpers';
import { HeaderPage } from '../../../../common/components/header_page';
import { ExceptionsViewer } from '../../../rule_exceptions/components/all_exception_items_table';
import { EditRuleSettingButtonLink } from '../../../../detections/pages/detection_engine/rules/details/components/edit_rule_settings_button_link';
import { useStartMlJobs } from '../../../rule_management/logic/use_start_ml_jobs';
import { useBulkDuplicateExceptionsConfirmation } from '../../../rule_management_ui/components/rules_table/bulk_actions/use_bulk_duplicate_confirmation';
import { BulkActionDuplicateExceptionsConfirmation } from '../../../rule_management_ui/components/rules_table/bulk_actions/bulk_duplicate_exceptions_confirmation';
import { useAsyncConfirmation } from '../../../rule_management_ui/components/rules_table/rules_table/use_async_confirmation';
import { RuleSnoozeBadge } from '../../../rule_management/components/rule_snooze_badge';
import { useRuleIndexPattern } from '../../../rule_creation_ui/pages/form';
import { DataSourceType } from '../../../../detections/pages/detection_engine/rules/types';
import { useBoolState } from '../../../../common/hooks/use_bool_state';
// eslint-disable-next-line no-restricted-imports
import { useLegacyUrlRedirect } from './use_redirect_legacy_url';
import { RuleDetailTabs, useRuleDetailsTabs } from './use_rule_details_tabs';

/**
 * Need a 100% height here to account for the graph/analyze tool, which sets no explicit height parameters, but fills the available space.
 */
const StyledFullHeightContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
`;

/**
 * Sets min-height on tab container to minimize page hop when switching to tabs with less content
 */
const StyledMinHeightTabContainer = styled.div`
  min-height: 800px;
`;

type DetectionEngineComponentProps = PropsFromRedux;

const RuleDetailsPageComponent: React.FC<DetectionEngineComponentProps> = ({
  clearEventsDeleted,
  clearEventsLoading,
  clearSelected,
}) => {
  const {
    data,
    application: {
      navigateToApp,
      capabilities: { actions },
    },
    timelines: timelinesUi,
    spaces: spacesApi,
  } = useKibana().services;

  const dispatch = useDispatch();
  const containerElement = useRef<HTMLDivElement | null>(null);
  const getTable = useMemo(() => dataTableSelectors.getTableByIdSelector(), []);

  const graphEventId = useShallowEqualSelector(
    (state) => (getTable(state, TableId.alertsOnRuleDetailsPage) ?? tableDefaults).graphEventId
  );
  const updatedAt = useShallowEqualSelector(
    (state) => (getTable(state, TableId.alertsOnRuleDetailsPage) ?? tableDefaults).updated
  );
  const isAlertsLoading = useShallowEqualSelector(
    (state) => (getTable(state, TableId.alertsOnRuleDetailsPage) ?? tableDefaults).isLoading
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
      hasIndexRead,
      signalIndexName,
      hasIndexWrite,
      hasIndexMaintenance,
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
  const { detailName: ruleId } = useParams<{
    detailName: string;
    tabName: string;
  }>();
  const {
    rule: maybeRule,
    refresh: refreshRule,
    loading: ruleLoading,
    isExistingRule,
  } = useRuleWithFallback(ruleId);

  const { pollForSignalIndex } = useSignalHelpers();
  const [rule, setRule] = useState<Rule | null>(null);
  const isLoading = ruleLoading && rule == null;

  const { starting: isStartingJobs, startMlJobs } = useStartMlJobs();
  const startMlJobsIfNeeded = useCallback(async () => {
    await startMlJobs(rule?.machine_learning_job_id);
  }, [rule, startMlJobs]);

  const pageTabs = useRuleDetailsTabs({ rule, ruleId, isExistingRule, hasIndexRead });

  const [isDeleteConfirmationVisible, showDeleteConfirmation, hideDeleteConfirmation] =
    useBoolState();

  const [confirmDeletion, handleDeletionConfirm, handleDeletionCancel] = useAsyncConfirmation({
    onInit: showDeleteConfirmation,
    onFinish: hideDeleteConfirmation,
  });

  const {
    aboutRuleData,
    modifiedAboutRuleDetailsData,
    defineRuleData,
    scheduleRuleData,
    ruleActionsData,
  } =
    rule != null
      ? getStepsData({ rule, detailsView: true })
      : {
          aboutRuleData: null,
          modifiedAboutRuleDetailsData: null,
          defineRuleData: null,
          scheduleRuleData: null,
          ruleActionsData: null,
        };
  const [dataViewTitle, setDataViewTitle] = useState<string>();
  useEffect(() => {
    const fetchDataViewTitle = async () => {
      if (defineRuleData?.dataViewId != null && defineRuleData?.dataViewId !== '') {
        const dataView = await data.dataViews.get(defineRuleData?.dataViewId);
        setDataViewTitle(dataView.title);
      }
    };
    fetchDataViewTitle();
  }, [data.dataViews, defineRuleData?.dataViewId]);

  const { indexPattern: ruleIndexPattern } = useRuleIndexPattern({
    dataSourceType: defineRuleData?.dataSourceType ?? DataSourceType.IndexPatterns,
    index: defineRuleData?.index ?? [],
    dataViewId: defineRuleData?.dataViewId,
  });

  const { showBuildingBlockAlerts, setShowBuildingBlockAlerts, showOnlyThreatIndicatorAlerts } =
    useDataTableFilters(TableId.alertsOnRuleDetailsPage);

  const mlCapabilities = useMlCapabilities();
  const { globalFullScreen } = useGlobalFullScreen();
  const [filterGroup, setFilterGroup] = useState<Status>(FILTER_OPEN);

  const { isSavedQueryLoading, savedQueryBar } = useGetSavedQuery({
    savedQueryId: rule?.saved_id,
    ruleType: rule?.type,
  });

  // TODO: Refactor license check + hasMlAdminPermissions to common check
  const hasMlPermissions = hasMlLicense(mlCapabilities) && hasMlAdminPermissions(mlCapabilities);

  const hasActionsPrivileges = useMemo(() => {
    if (rule?.actions != null && rule?.actions.length > 0 && isBoolean(actions.show)) {
      return actions.show;
    }
    return true;
  }, [actions, rule?.actions]);

  const navigateToAlertsTab = useCallback(() => {
    navigateToApp(APP_UI_ID, {
      deepLinkId: SecurityPageName.rules,
      path: getRuleDetailsTabUrl(ruleId ?? '', 'alerts', ''),
    });
  }, [navigateToApp, ruleId]);

  // persist rule until refresh is complete
  useEffect(() => {
    if (maybeRule != null) {
      setRule(maybeRule);
    }
  }, [maybeRule]);

  useLegacyUrlRedirect({ rule, spacesApi });

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
          <CreatedBy createdBy={rule?.created_by} createdAt={rule?.created_at} />,
          rule?.updated_by != null ? (
            <UpdatedBy updatedBy={rule?.updated_by} updatedAt={rule?.updated_at} />
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
      const tableId = TableId.alertsOnRuleDetailsPage;
      clearEventsLoading({ id: tableId });
      clearEventsDeleted({ id: tableId });
      clearSelected({ id: tableId });
      setFilterGroup(newFilterGroup);
    },
    [clearEventsLoading, clearEventsDeleted, clearSelected, setFilterGroup]
  );

  // Set showBuildingBlockAlerts if rule is a Building Block Rule otherwise we won't show alerts
  useEffect(() => {
    setShowBuildingBlockAlerts(rule?.building_block_type != null);
  }, [rule, setShowBuildingBlockAlerts]);

  const alertDefaultFilters = useMemo(
    () => [
      ...buildAlertsFilter(rule?.rule_id ?? ''),
      ...buildShowBuildingBlockFilter(showBuildingBlockAlerts),
      ...buildAlertStatusFilter(filterGroup),
      ...buildThreatMatchFilter(showOnlyThreatIndicatorAlerts),
    ],
    [rule, showBuildingBlockAlerts, showOnlyThreatIndicatorAlerts, filterGroup]
  );

  const alertMergedFilters = useMemo(
    () => [...alertDefaultFilters, ...filters],
    [alertDefaultFilters, filters]
  );

  const lastExecution = rule?.execution_summary?.last_execution;
  const lastExecutionStatus = lastExecution?.status;
  const lastExecutionDate = lastExecution?.date ?? '';
  const lastExecutionMessage = lastExecution?.message ?? '';

  const ruleStatusInfo = useMemo(() => {
    return (
      <>
        {ruleLoading ? (
          <EuiFlexItem>
            <EuiLoadingSpinner size="m" data-test-subj="rule-status-loader" />
          </EuiFlexItem>
        ) : (
          <RuleStatus status={lastExecutionStatus} date={lastExecutionDate}>
            <EuiButtonIcon
              data-test-subj="ruleLastExecutionStatusRefreshButton"
              color="primary"
              onClick={refreshRule}
              iconType="refresh"
              aria-label={ruleI18n.REFRESH}
              isDisabled={!isExistingRule}
            />
          </RuleStatus>
        )}
        <EuiFlexItem grow={false}>
          <RuleSnoozeBadge ruleId={ruleId} showTooltipInline />
        </EuiFlexItem>
      </>
    );
  }, [ruleId, lastExecutionStatus, lastExecutionDate, ruleLoading, isExistingRule, refreshRule]);

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
          id: InputsModelId.global,
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
  const currentAlertStatusFilterValue = useMemo(() => [filterGroup], [filterGroup]);
  const updatedAtValue = useMemo(() => {
    return timelinesUi.getLastUpdated({
      updatedAt: updatedAt || Date.now(),
      showUpdating,
    });
  }, [updatedAt, showUpdating, timelinesUi]);

  const renderGroupedAlertTable = useCallback(
    (groupingFilters: Filter[]) => {
      return (
        <AlertsTableComponent
          configId={ALERTS_TABLE_REGISTRY_CONFIG_IDS.RULE_DETAILS}
          flyoutSize="m"
          inputFilters={[...alertMergedFilters, ...groupingFilters]}
          tableId={TableId.alertsOnRuleDetailsPage}
          onRuleChange={refreshRule}
        />
      );
    },
    [alertMergedFilters, refreshRule]
  );

  const {
    isBulkDuplicateConfirmationVisible,
    showBulkDuplicateConfirmation,
    cancelRuleDuplication,
    confirmRuleDuplication,
  } = useBulkDuplicateExceptionsConfirmation();

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

  const hasNotificationActions = ruleActionsData != null && ruleActionsData.actions.length > 0;
  const hasResponseActions =
    ruleActionsData != null && (ruleActionsData.responseActions || []).length > 0;
  const hasActions = hasNotificationActions || hasResponseActions;

  return (
    <>
      <NeedAdminForUpdateRulesCallOut />
      <MissingPrivilegesCallOut />
      {isBulkDuplicateConfirmationVisible && (
        <BulkActionDuplicateExceptionsConfirmation
          onCancel={cancelRuleDuplication}
          onConfirm={confirmRuleDuplication}
          rulesCount={1}
        />
      )}
      {isDeleteConfirmationVisible && (
        <EuiConfirmModal
          title={ruleI18n.SINGLE_DELETE_CONFIRMATION_TITLE}
          onCancel={handleDeletionCancel}
          onConfirm={handleDeletionConfirm}
          confirmButtonText={ruleI18n.DELETE_CONFIRMATION_CONFIRM}
          cancelButtonText={ruleI18n.DELETE_CONFIRMATION_CANCEL}
          buttonColor="danger"
          defaultFocusedButton="confirm"
          data-test-subj="deleteRulesConfirmationModal"
        >
          {i18n.DELETE_CONFIRMATION_BODY}
        </EuiConfirmModal>
      )}
      <StyledFullHeightContainer onKeyDown={onKeyDown} ref={containerElement}>
        <EuiWindowEvent event="resize" handler={noop} />
        <FiltersGlobal show={showGlobalFilters({ globalFullScreen, graphEventId })}>
          <SiemSearchBar
            id={InputsModelId.global}
            pollForSignalIndex={pollForSignalIndex}
            indexPattern={indexPattern}
          />
        </FiltersGlobal>
        <RuleDetailsContextProvider>
          <SecuritySolutionPageWrapper noPadding={globalFullScreen}>
            <Display show={!globalFullScreen}>
              <HeaderPage
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
                      content={explainLackOfPermission(
                        rule,
                        hasMlPermissions,
                        hasActionsPrivileges,
                        canUserCRUD
                      )}
                    >
                      <EuiFlexGroup>
                        <RuleSwitch
                          id={rule?.id ?? '-1'}
                          isDisabled={
                            !isExistingRule ||
                            !canEditRuleWithActions(rule, hasActionsPrivileges) ||
                            !hasUserCRUDPermission(canUserCRUD) ||
                            (isMlRule(rule?.type) && !hasMlPermissions)
                          }
                          enabled={isExistingRule && (rule?.enabled ?? false)}
                          startMlJobsIfNeeded={startMlJobsIfNeeded}
                          onChange={handleOnChangeEnabledRule}
                        />
                        <EuiFlexItem>{i18n.ENABLE_RULE}</EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiToolTip>
                  </EuiFlexItem>

                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EditRuleSettingButtonLink
                          ruleId={ruleId}
                          disabled={
                            !isExistingRule ||
                            !hasUserCRUDPermission(canUserCRUD) ||
                            (isMlRule(rule?.type) && !hasMlPermissions)
                          }
                          disabledReason={explainLackOfPermission(
                            rule,
                            hasMlPermissions,
                            hasActionsPrivileges,
                            canUserCRUD
                          )}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <RuleActionsOverflow
                          rule={rule}
                          userHasPermissions={isExistingRule && hasUserCRUDPermission(canUserCRUD)}
                          canDuplicateRuleWithActions={canEditRuleWithActions(
                            rule,
                            hasActionsPrivileges
                          )}
                          showBulkDuplicateExceptionsConfirmation={showBulkDuplicateConfirmation}
                          confirmDeletion={confirmDeletion}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </HeaderPage>
              {ruleError}
              <LegacyUrlConflictCallOut rule={rule} spacesApi={spacesApi} />
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
                    <EuiFlexItem component="section" grow={1} data-test-subj="defineRule">
                      <StepPanel
                        loading={isLoading || isSavedQueryLoading}
                        title={ruleI18n.DEFINITION}
                      >
                        {defineRuleData != null && !isSavedQueryLoading && !isStartingJobs && (
                          <StepDefineRuleReadOnly
                            addPadding={false}
                            descriptionColumns="singleSplit"
                            defaultValues={{
                              dataViewTitle,
                              ...defineRuleData,
                              queryBar: savedQueryBar ?? defineRuleData.queryBar,
                            }}
                            indexPattern={ruleIndexPattern}
                          />
                        )}
                      </StepPanel>
                    </EuiFlexItem>
                    <EuiSpacer />
                    <EuiFlexItem data-test-subj="schedule" component="section" grow={1}>
                      <StepPanel loading={isLoading} title={ruleI18n.SCHEDULE}>
                        {scheduleRuleData != null && (
                          <StepScheduleRuleReadOnly
                            addPadding={false}
                            descriptionColumns="singleSplit"
                            defaultValues={scheduleRuleData}
                          />
                        )}
                      </StepPanel>
                    </EuiFlexItem>
                    {hasActions && (
                      <EuiFlexItem data-test-subj="actions" component="section" grow={1}>
                        <StepPanel loading={isLoading} title={ruleI18n.ACTIONS}>
                          <StepRuleActionsReadOnly
                            addPadding={false}
                            defaultValues={ruleActionsData}
                          />
                        </StepPanel>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer />
              <TabNavigation navTabs={pageTabs} />
              <EuiSpacer />
            </Display>
            <StyledMinHeightTabContainer>
              <Routes>
                <Route path={`/rules/id/:detailName/:tabName(${RuleDetailTabs.alerts})`}>
                  <>
                    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                      <EuiFlexItem grow={false}>
                        <AlertsTableFilterGroup
                          status={filterGroup}
                          onFilterGroupChanged={onFilterGroupChangedCallback}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>{updatedAtValue}</EuiFlexItem>
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
                      <GroupedAlertsTable
                        currentAlertStatusFilterValue={currentAlertStatusFilterValue}
                        defaultFilters={alertMergedFilters}
                        from={from}
                        globalFilters={filters}
                        globalQuery={query}
                        hasIndexMaintenance={hasIndexMaintenance ?? false}
                        hasIndexWrite={hasIndexWrite ?? false}
                        loading={loading}
                        renderChildComponent={renderGroupedAlertTable}
                        runtimeMappings={runtimeMappings}
                        signalIndexName={signalIndexName}
                        tableId={TableId.alertsOnRuleDetailsPage}
                        to={to}
                      />
                    )}
                  </>
                </Route>
                <Route path={`/rules/id/:detailName/:tabName(${RuleDetailTabs.exceptions})`}>
                  <ExceptionsViewer
                    rule={rule}
                    listTypes={[
                      ExceptionListTypeEnum.DETECTION,
                      ExceptionListTypeEnum.RULE_DEFAULT,
                    ]}
                    onRuleChange={refreshRule}
                    isViewReadOnly={!isExistingRule}
                    data-test-subj="exceptionTab"
                  />
                </Route>
                <Route
                  path={`/rules/id/:detailName/:tabName(${RuleDetailTabs.endpointExceptions})`}
                >
                  <ExceptionsViewer
                    rule={rule}
                    listTypes={[ExceptionListTypeEnum.ENDPOINT]}
                    onRuleChange={refreshRule}
                    isViewReadOnly={!isExistingRule}
                    data-test-subj="endpointExceptionsTab"
                  />
                </Route>
                <Route path={`/rules/id/:detailName/:tabName(${RuleDetailTabs.executionResults})`}>
                  <ExecutionLogTable ruleId={ruleId} selectAlertsTab={navigateToAlertsTab} />
                </Route>
                <Route path={`/rules/id/:detailName/:tabName(${RuleDetailTabs.executionEvents})`}>
                  <ExecutionEventsTable ruleId={ruleId} />
                </Route>
              </Routes>
            </StyledMinHeightTabContainer>
          </SecuritySolutionPageWrapper>
        </RuleDetailsContextProvider>
      </StyledFullHeightContainer>
      <SpyRoute
        pageName={SecurityPageName.rules}
        state={{ ruleName: rule?.name, isExistingRule }}
      />
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

RuleDetailsPageComponent.displayName = 'RuleDetailsPageComponent';

export const RuleDetailsPage = connector(React.memo(RuleDetailsPageComponent));

RuleDetailsPage.displayName = 'RuleDetailsPage';
