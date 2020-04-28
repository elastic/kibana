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

import { FiltersGlobal } from '../../../../components/filters_global';
import { FormattedDate } from '../../../../components/formatted_date';
import {
  getEditRuleUrl,
  getRulesUrl,
  DETECTION_ENGINE_PAGE_NAME,
} from '../../../../components/link_to/redirect_to_detection_engine';
import { SiemSearchBar } from '../../../../components/search_bar';
import { WrapperPage } from '../../../../components/wrapper_page';
import { useRule } from '../../../../containers/detection_engine/rules';

import {
  indicesExistOrDataTemporarilyUnavailable,
  WithSource,
} from '../../../../containers/source';
import { SpyRoute } from '../../../../utils/route/spy_routes';

import { StepAboutRuleToggleDetails } from '../components/step_about_rule_details/';
import { DetectionEngineHeaderPage } from '../../components/detection_engine_header_page';
import { SignalsHistogramPanel } from '../../components/signals_histogram_panel';
import { SignalsTable } from '../../components/signals';
import { useUserInfo } from '../../components/user_info';
import { DetectionEngineEmptyPage } from '../../detection_engine_empty_page';
import { useSignalInfo } from '../../components/signals_info';
import { StepDefineRule } from '../components/step_define_rule';
import { StepScheduleRule } from '../components/step_schedule_rule';
import { buildSignalsRuleIdFilter } from '../../components/signals/default_config';
import { NoWriteSignalsCallOut } from '../../components/no_write_signals_callout';
import * as detectionI18n from '../../translations';
import { ReadOnlyCallOut } from '../components/read_only_callout';
import { RuleSwitch } from '../components/rule_switch';
import { StepPanel } from '../components/step_panel';
import { getStepsData, redirectToDetections, userHasNoPermissions } from '../helpers';
import * as ruleI18n from '../translations';
import * as i18n from './translations';
import { GlobalTime } from '../../../../containers/global_time';
import { signalsHistogramOptions } from '../../components/signals_histogram_panel/config';
import { inputsSelectors } from '../../../../store/inputs';
import { State } from '../../../../store';
import { InputsRange } from '../../../../store/inputs/model';
import { setAbsoluteRangeDatePicker as dispatchSetAbsoluteRangeDatePicker } from '../../../../store/inputs/actions';
import { RuleActionsOverflow } from '../components/rule_actions_overflow';
import { RuleStatusFailedCallOut } from './status_failed_callout';
import { FailureHistory } from './failure_history';
import { RuleStatus } from '../components/rule_status';
import { useMlCapabilities } from '../../../../components/ml_popover/hooks/use_ml_capabilities';
import { hasMlAdminPermissions } from '../../../../components/ml/permissions/has_ml_admin_permissions';

enum RuleDetailTabs {
  signals = 'signals',
  failures = 'failures',
}

const ruleDetailTabs = [
  {
    id: RuleDetailTabs.signals,
    name: detectionI18n.SIGNAL,
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
  const [ruleDetailTab, setRuleDetailTab] = useState(RuleDetailTabs.signals);
  const { aboutRuleData, modifiedAboutRuleDetailsData, defineRuleData, scheduleRuleData } =
    rule != null
      ? getStepsData({ rule, detailsView: true })
      : {
          aboutRuleData: null,
          modifiedAboutRuleDetailsData: null,
          defineRuleData: null,
          scheduleRuleData: null,
        };
  const [lastSignals] = useSignalInfo({ ruleId });
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
            id="xpack.siem.detectionEngine.ruleDetails.ruleCreationDescription"
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
              id="xpack.siem.detectionEngine.ruleDetails.ruleUpdateDescription"
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

  const signalDefaultFilters = useMemo(
    () => (ruleId != null ? buildSignalsRuleIdFilter(ruleId) : []),
    [ruleId]
  );

  const signalMergedFilters = useMemo(() => [...signalDefaultFilters, ...filters], [
    signalDefaultFilters,
    filters,
  ]);

  const tabs = useMemo(
    () => (
      <EuiTabs>
        {ruleDetailTabs.map(tab => (
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
    [ruleDetailTabs, ruleDetailTab, setRuleDetailTab]
  );
  const ruleError = useMemo(
    () =>
      rule?.status === 'failed' &&
      ruleDetailTab === RuleDetailTabs.signals &&
      rule?.last_failure_at != null ? (
        <RuleStatusFailedCallOut
          message={rule?.last_failure_message ?? ''}
          date={rule?.last_failure_at}
        />
      ) : null,
    [rule, ruleDetailTab]
  );

  const indexToAdd = useMemo(() => (signalIndexName == null ? [] : [signalIndexName]), [
    signalIndexName,
  ]);

  const updateDateRangeCallback = useCallback(
    (min: number, max: number) => {
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
      {hasIndexWrite != null && !hasIndexWrite && <NoWriteSignalsCallOut />}
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
                        ...(lastSignals != null
                          ? [
                              <>
                                {detectionI18n.LAST_SIGNAL}
                                {': '}
                                {lastSignals}
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
                    {ruleDetailTab === RuleDetailTabs.signals && (
                      <>
                        <SignalsHistogramPanel
                          deleteQuery={deleteQuery}
                          filters={signalMergedFilters}
                          query={query}
                          from={from}
                          signalIndexName={signalIndexName}
                          setQuery={setQuery}
                          stackByOptions={signalsHistogramOptions}
                          to={to}
                          updateDateRange={updateDateRangeCallback}
                        />
                        <EuiSpacer />
                        {ruleId != null && (
                          <SignalsTable
                            canUserCRUD={canUserCRUD ?? false}
                            defaultFilters={signalDefaultFilters}
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
