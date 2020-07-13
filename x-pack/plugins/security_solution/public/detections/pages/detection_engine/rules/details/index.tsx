/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react-hooks/rules-of-hooks, complexity */
// TODO: Disabling complexity is temporary till this component is refactored as part of lists UI integration

import {
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { FC, memo, useCallback, useMemo, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { StickyContainer } from 'react-sticky';
import { connect, ConnectedProps } from 'react-redux';

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
import { useRule } from '../../../../containers/detection_engine/rules';

import { useWithSource } from '../../../../../common/containers/source';
import { SpyRoute } from '../../../../../common/utils/route/spy_routes';

import { StepAboutRuleToggleDetails } from '../../../../components/rules/step_about_rule_details';
import { DetectionEngineHeaderPage } from '../../../../components/detection_engine_header_page';
import { AlertsHistogramPanel } from '../../../../components/alerts_histogram_panel';
import { AlertsTable } from '../../../../components/alerts_table';
import { useUserInfo } from '../../../../components/user_info';
import { OverviewEmpty } from '../../../../../overview/components/overview_empty';
import { useAlertInfo } from '../../../../components/alerts_info';
import { StepDefineRule } from '../../../../components/rules/step_define_rule';
import { StepScheduleRule } from '../../../../components/rules/step_schedule_rule';
import { buildAlertsRuleIdFilter } from '../../../../components/alerts_table/default_config';
import { NoWriteAlertsCallOut } from '../../../../components/no_write_alerts_callout';
import * as detectionI18n from '../../translations';
import { ReadOnlyCallOut } from '../../../../components/rules/read_only_callout';
import { RuleSwitch } from '../../../../components/rules/rule_switch';
import { StepPanel } from '../../../../components/rules/step_panel';
import { getStepsData, redirectToDetections, userHasNoPermissions } from '../helpers';
import * as ruleI18n from '../translations';
import * as i18n from './translations';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { alertsHistogramOptions } from '../../../../components/alerts_histogram_panel/config';
import { inputsSelectors } from '../../../../../common/store/inputs';
import { State } from '../../../../../common/store';
import { InputsRange } from '../../../../../common/store/inputs/model';
import { setAbsoluteRangeDatePicker as dispatchSetAbsoluteRangeDatePicker } from '../../../../../common/store/inputs/actions';
import { RuleActionsOverflow } from '../../../../components/rules/rule_actions_overflow';
import { RuleStatusFailedCallOut } from './status_failed_callout';
import { FailureHistory } from './failure_history';
import { RuleStatus } from '../../../../components/rules//rule_status';
import { useMlCapabilities } from '../../../../../common/components/ml_popover/hooks/use_ml_capabilities';
import { hasMlAdminPermissions } from '../../../../../../common/machine_learning/has_ml_admin_permissions';
import { SecurityPageName } from '../../../../../app/types';
import { LinkButton } from '../../../../../common/components/links';
import { useFormatUrl } from '../../../../../common/components/link_to';
import { ExceptionsViewer } from '../../../../../common/components/exceptions/viewer';
import { ExceptionListTypeEnum, ExceptionIdentifiers } from '../../../../../lists_plugin_deps';

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
  },
  {
    id: RuleDetailTabs.exceptions,
    name: i18n.EXCEPTIONS_TAB,
    disabled: false,
  },
  {
    id: RuleDetailTabs.failures,
    name: i18n.FAILURE_HISTORY_TAB,
    disabled: false,
  },
];

export const RuleDetailsPageComponent: FC<PropsFromRedux> = ({
  filters,
  query,
  setAbsoluteRangeDatePicker,
}) => {
  const { to, from, deleteQuery, setQuery } = useGlobalTime();
  const {
    loading,
    isSignalIndexExists,
    isAuthenticated,
    hasEncryptionKey,
    canUserCRUD,
    hasIndexWrite,
    signalIndexName,
  } = useUserInfo();
  const { detailName: ruleId } = useParams();
  const [isLoading, rule] = useRule(ruleId);
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
  const mlCapabilities = useMlCapabilities();
  const history = useHistory();
  const { formatUrl } = useFormatUrl(SecurityPageName.detections);

  // TODO: Refactor license check + hasMlAdminPermissions to common check
  const hasMlPermissions =
    mlCapabilities.isPlatinumOrTrialLicense && hasMlAdminPermissions(mlCapabilities);

  const title = isLoading === true || rule === null ? <EuiLoadingSpinner size="m" /> : rule.name;
  const subTitle = useMemo(
    () =>
      isLoading === true || rule === null ? (
        <EuiLoadingSpinner size="m" />
      ) : (
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
      ),
    [isLoading, rule]
  );

  const alertDefaultFilters = useMemo(
    () => (ruleId != null ? buildAlertsRuleIdFilter(ruleId) : []),
    [ruleId]
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
          >
            {tab.name}
          </EuiTab>
        ))}
      </EuiTabs>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ruleDetailTabs, ruleDetailTab, setRuleDetailTab]
  );
  const ruleError = useMemo(
    () =>
      rule?.status === 'failed' &&
      ruleDetailTab === RuleDetailTabs.alerts &&
      rule?.last_failure_at != null ? (
        <RuleStatusFailedCallOut
          message={rule?.last_failure_message ?? ''}
          date={rule?.last_failure_at}
        />
      ) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rule, ruleDetailTab]
  );

  const indexToAdd = useMemo(() => (signalIndexName == null ? [] : [signalIndexName]), [
    signalIndexName,
  ]);

  const updateDateRangeCallback = useCallback<UpdateDateRange>(
    ({ x }) => {
      if (!x) {
        return;
      }
      const [min, max] = x;
      setAbsoluteRangeDatePicker({ id: 'global', from: min, to: max });
    },
    [setAbsoluteRangeDatePicker]
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

  const { indicesExist, indexPattern } = useWithSource('default', indexToAdd);

  const exceptionLists = useMemo((): {
    lists: ExceptionIdentifiers[];
    allowedExceptionListTypes: ExceptionListTypeEnum[];
  } => {
    if (rule != null && rule.exceptions_list != null) {
      return rule.exceptions_list.reduce<{
        lists: ExceptionIdentifiers[];
        allowedExceptionListTypes: ExceptionListTypeEnum[];
      }>(
        (acc, { id, namespace_type, type }) => {
          const { allowedExceptionListTypes, lists } = acc;
          const shouldAddEndpoint =
            type === ExceptionListTypeEnum.ENDPOINT &&
            !allowedExceptionListTypes.includes(ExceptionListTypeEnum.ENDPOINT);
          return {
            lists: [...lists, { id, namespaceType: namespace_type, type }],
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

  if (redirectToDetections(isSignalIndexExists, isAuthenticated, hasEncryptionKey)) {
    history.replace(getDetectionEngineUrl());
    return null;
  }

  return (
    <>
      {hasIndexWrite != null && !hasIndexWrite && <NoWriteAlertsCallOut />}
      {userHasNoPermissions(canUserCRUD) && <ReadOnlyCallOut />}
      {indicesExist ? (
        <StickyContainer>
          <FiltersGlobal>
            <SiemSearchBar id="global" indexPattern={indexPattern} />
          </FiltersGlobal>

          <WrapperPage>
            <DetectionEngineHeaderPage
              backOptions={{
                href: getRulesUrl(),
                text: i18n.BACK_TO_RULES,
                pageId: SecurityPageName.detections,
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
                <RuleStatus ruleId={ruleId ?? null} ruleEnabled={ruleEnabled} />,
              ]}
              title={title}
            >
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    position="top"
                    content={
                      rule?.type === 'machine_learning' && !hasMlPermissions
                        ? detectionI18n.ML_RULES_DISABLED_MESSAGE
                        : undefined
                    }
                  >
                    <RuleSwitch
                      id={rule?.id ?? '-1'}
                      isDisabled={
                        userHasNoPermissions(canUserCRUD) || (!hasMlPermissions && !rule?.enabled)
                      }
                      enabled={rule?.enabled ?? false}
                      optionLabel={i18n.ACTIVATE_RULE}
                      onChange={handleOnChangeEnabledRule}
                    />
                  </EuiToolTip>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <LinkButton
                        onClick={goToEditRule}
                        iconType="controlsHorizontal"
                        isDisabled={userHasNoPermissions(canUserCRUD) ?? true}
                        href={formatUrl(getEditRuleUrl(ruleId ?? ''))}
                      >
                        {ruleI18n.EDIT_RULE_SETTINGS}
                      </LinkButton>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <RuleActionsOverflow
                        rule={rule}
                        userHasNoPermissions={userHasNoPermissions(canUserCRUD)}
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
            {ruleDetailTab === RuleDetailTabs.alerts && (
              <>
                <AlertsHistogramPanel
                  deleteQuery={deleteQuery}
                  filters={alertMergedFilters}
                  query={query}
                  from={from}
                  signalIndexName={signalIndexName}
                  setQuery={setQuery}
                  stackByOptions={alertsHistogramOptions}
                  to={to}
                  updateDateRange={updateDateRangeCallback}
                />
                <EuiSpacer />
                {ruleId != null && (
                  <AlertsTable
                    timelineId={TimelineId.detectionsRulesDetailsPage}
                    canUserCRUD={canUserCRUD ?? false}
                    defaultFilters={alertDefaultFilters}
                    hasIndexWrite={hasIndexWrite ?? false}
                    from={from}
                    loading={loading}
                    signalsIndex={signalIndexName ?? ''}
                    to={to}
                  />
                )}
              </>
            )}
            {ruleDetailTab === RuleDetailTabs.exceptions && (
              <ExceptionsViewer
                ruleId={ruleId ?? ''}
                ruleName={rule?.name ?? ''}
                availableListTypes={exceptionLists.allowedExceptionListTypes}
                commentsAccordionId={'ruleDetailsTabExceptions'}
                exceptionListsMeta={exceptionLists.lists}
              />
            )}
            {ruleDetailTab === RuleDetailTabs.failures && <FailureHistory id={rule?.id} />}
          </WrapperPage>
        </StickyContainer>
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

const makeMapStateToProps = () => {
  const getGlobalInputs = inputsSelectors.globalSelector();
  return (state: State) => {
    const globalInputs: InputsRange = getGlobalInputs(state);
    const { query, filters } = globalInputs;

    return {
      query,
      filters,
    };
  };
};

const mapDispatchToProps = {
  setAbsoluteRangeDatePicker: dispatchSetAbsoluteRangeDatePicker,
};

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const RuleDetailsPage = connector(memo(RuleDetailsPageComponent));

RuleDetailsPage.displayName = 'RuleDetailsPage';
