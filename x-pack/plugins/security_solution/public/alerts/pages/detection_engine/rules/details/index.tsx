/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react-hooks/rules-of-hooks */

import {
  EuiButton,
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
import { Redirect, useParams } from 'react-router-dom';
import { StickyContainer } from 'react-sticky';
import { connect, ConnectedProps } from 'react-redux';

import { UpdateDateRange } from '../../../../../common/components/charts/common';
import { FiltersGlobal } from '../../../../../common/components/filters_global';
import { FormattedDate } from '../../../../../common/components/formatted_date';
import {
  getEditRuleUrl,
  getRulesUrl,
  DETECTION_ENGINE_PAGE_NAME,
} from '../../../../../common/components/link_to/redirect_to_detection_engine';
import { SiemSearchBar } from '../../../../../common/components/search_bar';
import { WrapperPage } from '../../../../../common/components/wrapper_page';
import { useRule } from '../../../../../alerts/containers/detection_engine/rules';

import {
  indicesExistOrDataTemporarilyUnavailable,
  WithSource,
} from '../../../../../common/containers/source';
import { SpyRoute } from '../../../../../common/utils/route/spy_routes';

import { StepAboutRuleToggleDetails } from '../../../../components/rules/step_about_rule_details';
import { DetectionEngineHeaderPage } from '../../../../components/detection_engine_header_page';
import { AlertsHistogramPanel } from '../../../../components/alerts_histogram_panel';
import { AlertsTable } from '../../../../components/alerts_table';
import { useUserInfo } from '../../../../components/user_info';
import { DetectionEngineEmptyPage } from '../../detection_engine_empty_page';
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
import { GlobalTime } from '../../../../../common/containers/global_time';
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

enum RuleDetailTabs {
  alerts = 'alerts',
  failures = 'failures',
}

const ruleDetailTabs = [
  {
    id: RuleDetailTabs.alerts,
    name: detectionI18n.ALERT,
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

  if (redirectToDetections(isSignalIndexExists, isAuthenticated, hasEncryptionKey)) {
    return <Redirect to={`/${DETECTION_ENGINE_PAGE_NAME}`} />;
  }

  return (
    <>
      {hasIndexWrite != null && !hasIndexWrite && <NoWriteAlertsCallOut />}
      {userHasNoPermissions(canUserCRUD) && <ReadOnlyCallOut />}
      <WithSource sourceId="default" indexToAdd={indexToAdd}>
        {({ indicesExist, indexPattern }) => {
          return indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
            <GlobalTime>
              {({ to, from, deleteQuery, setQuery }) => (
                <StickyContainer>
                  <FiltersGlobal>
                    <SiemSearchBar id="global" indexPattern={indexPattern} />
                  </FiltersGlobal>

                  <WrapperPage>
                    <DetectionEngineHeaderPage
                      backOptions={{
                        href: getRulesUrl(),
                        text: i18n.BACK_TO_RULES,
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
                                userHasNoPermissions(canUserCRUD) ||
                                (!hasMlPermissions && !rule?.enabled)
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
                              <EuiButton
                                href={getEditRuleUrl(ruleId ?? '')}
                                iconType="controlsHorizontal"
                                isDisabled={userHasNoPermissions(canUserCRUD) ?? true}
                              >
                                {ruleI18n.EDIT_RULE_SETTINGS}
                              </EuiButton>
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
                    {ruleDetailTab === RuleDetailTabs.failures && <FailureHistory id={rule?.id} />}
                  </WrapperPage>
                </StickyContainer>
              )}
            </GlobalTime>
          ) : (
            <WrapperPage>
              <DetectionEngineHeaderPage border title={i18n.PAGE_TITLE} />

              <DetectionEngineEmptyPage />
            </WrapperPage>
          );
        }}
      </WithSource>

      <SpyRoute state={{ ruleName: rule?.name }} />
    </>
  );
};

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
