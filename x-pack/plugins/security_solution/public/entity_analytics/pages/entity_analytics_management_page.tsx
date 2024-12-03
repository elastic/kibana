/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  EuiHorizontalRule,
  EuiButton,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import styled from '@emotion/styled';
import { euiThemeVars } from '@kbn/ui-theme';
import moment from 'moment';
import { RiskScorePreviewSection } from '../components/risk_score_preview_section';
import { RiskScoreEnableSection } from '../components/risk_score_enable_section';
import { ENTITY_ANALYTICS_RISK_SCORE } from '../../app/translations';
import { RiskEnginePrivilegesCallOut } from '../components/risk_engine_privileges_callout';
import { useMissingRiskEnginePrivileges } from '../hooks/use_missing_risk_engine_privileges';
import { RiskScoreUsefulLinksSection } from '../components/risk_score_useful_links_section';
import { RiskScoreConfigurationSection } from '../components/risk_score_configuration_section';
import { useRiskEngineStatus } from '../api/hooks/use_risk_engine_status';
import { useScheduleNowRiskEngineMutation } from '../api/hooks/use_schedule_now_risk_engine_mutation';
import { useAppToasts } from '../../common/hooks/use_app_toasts';
import * as i18n from '../translations';

export const EntityAnalyticsManagementPage = () => {
  const privileges = useMissingRiskEnginePrivileges();
  const [includeClosedAlerts, setIncludeClosedAlerts] = useState(false);
  const [from, setFrom] = useState(localStorage.getItem('dateStart') || 'now-30m');
  const [to, setTo] = useState(localStorage.getItem('dateEnd') || 'now');
  const { data: riskEngineStatus } = useRiskEngineStatus();
  const currentRiskEngineStatus = riskEngineStatus?.risk_engine_status;
  const runEngineEnabled = currentRiskEngineStatus === 'ENABLED';
  const [isLoading, setIsLoading] = useState(false);
  const { mutate: scheduleNowRiskEngine } = useScheduleNowRiskEngineMutation();
  const { addSuccess } = useAppToasts();
  const VerticalSeparator = styled.div`
    :before {
      content: '';
      height: ${euiThemeVars.euiSizeM};
      border-left: ${euiThemeVars.euiBorderWidthThin} solid ${euiThemeVars.euiColorLightShade};
    }
  `;

  const handleRunEngineClick = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      scheduleNowRiskEngine();

      if (!isLoading) {
        addSuccess(i18n.RISK_SCORE_ENGINE_RUN_SUCCESS, { toastLifeTimeMs: 5000 });
      }
    } catch (error) {
      addSuccess(i18n.RISK_SCORE_ENGINE_RUN_FAILURE, { toastLifeTimeMs: 5000 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleIncludeClosedAlertsToggle = (value: boolean) => {
    setIncludeClosedAlerts(value);
  };

  const handleDateChange = ({ start, end }: { start: string; end: string }) => {
    setFrom(start);
    setTo(end);
    localStorage.setItem('dateStart', start);
    localStorage.setItem('dateEnd', end);
  };

  const { status, runAt } = riskEngineStatus?.risk_engine_task_status || {};

  const isRunning = useMemo(
    () => status === 'running' || (!!runAt && new Date(runAt) < new Date()),
    [runAt, status]
  );

  const formatTimeFromNow = (time: string | undefined): string => {
    if (!time) {
      return '';
    }
    const scheduleTime = moment(time);
    return i18n.RISK_ENGINE_NEXT_RUN_TIME(scheduleTime.fromNow(true));
  };

  const countDownText = useMemo(
    () =>
      isRunning
        ? 'Now running'
        : formatTimeFromNow(riskEngineStatus?.risk_engine_task_status?.runAt),
    [isRunning, riskEngineStatus?.risk_engine_task_status?.runAt]
  );

  return (
    <>
      <RiskEnginePrivilegesCallOut privileges={privileges} />
      <EuiPageHeader
        pageTitle={
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem data-test-subj="entityAnalyticsManagementPageTitle" grow={false}>
              {ENTITY_ANALYTICS_RISK_SCORE}
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="s">
                {/* Run Engine Button */}
                {runEngineEnabled && (
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      size="s"
                      iconType="play"
                      isLoading={isLoading}
                      onClick={handleRunEngineClick}
                    >
                      {i18n.RUN_RISK_SCORE_ENGINE}
                    </EuiButton>
                  </EuiFlexItem>
                )}
                <EuiSpacer size="s" />
                {/* Vertical Line */}
                {runEngineEnabled && (
                  <EuiFlexItem grow={false}>
                    <VerticalSeparator />
                  </EuiFlexItem>
                )}
                <EuiSpacer size="s" />
                {/* Text: "Next engine run in {} minutes" */}
                {runEngineEnabled && (
                  <EuiFlexItem grow={false}>
                    <EuiText size="s" color="subdued">
                      {` ${countDownText}`}
                    </EuiText>
                  </EuiFlexItem>
                )}

                <EuiFlexItem grow={false}>
                  <RiskScoreEnableSection privileges={privileges} />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      />

      <EuiHorizontalRule />
      <EuiFlexGroup gutterSize="xl" alignItems="flexStart">
        <EuiFlexItem grow={2}>
          <RiskScoreConfigurationSection
            includeClosedAlerts={includeClosedAlerts}
            setIncludeClosedAlerts={handleIncludeClosedAlertsToggle}
            from={from}
            to={to}
            onDateChange={handleDateChange}
          />
          <EuiHorizontalRule />
          <RiskScoreUsefulLinksSection />
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <RiskScorePreviewSection
            privileges={privileges}
            includeClosedAlerts={includeClosedAlerts}
            from={from}
            to={to}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

EntityAnalyticsManagementPage.displayName = 'EntityAnalyticsManagementPage';
