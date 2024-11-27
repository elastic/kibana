/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  EuiHorizontalRule,
  EuiButton,
  useEuiTheme,
} from '@elastic/eui';

import { RiskScorePreviewSection } from '../components/risk_score_preview_section';
import { RiskScoreEnableSection } from '../components/risk_score_enable_section';
import { ENTITY_ANALYTICS_RISK_SCORE } from '../../app/translations';
import { RiskEnginePrivilegesCallOut } from '../components/risk_engine_privileges_callout';
import { useMissingRiskEnginePrivileges } from '../hooks/use_missing_risk_engine_privileges';
import { RiskScoreUsefulLinksSection } from '../components/risk_score_useful_links_section';
import { IncludeClosedAlertsSection } from '../components/include_closed_alerts_section';
import { useRiskEngineStatus } from '../api/hooks/use_risk_engine_status';
import { useScheduleNowRiskEngineMutation } from '../api/hooks/use_schedule_now_risk_engine_mutation';
import { useAppToasts } from '../../common/hooks/use_app_toasts';
import * as i18n from '../translations';

export const EntityAnalyticsManagementPage = () => {
  const privileges = useMissingRiskEnginePrivileges();
  const [includeClosedAlerts, setIncludeClosedAlerts] = useState(false);
  const [from, setFrom] = useState(localStorage.getItem('dateStart') || 'now-30m');
  const [to, setTo] = useState(localStorage.getItem('dateEnd') || 'now');
  const { euiTheme } = useEuiTheme();
  const { data: riskEngineStatus } = useRiskEngineStatus();
  const currentRiskEngineStatus = riskEngineStatus?.risk_engine_status;
  const runEngineEnabled = currentRiskEngineStatus === 'ENABLED';
  const [isLoading, setIsLoading] = useState(false);
  const { mutate: scheduleNowRiskEngine } = useScheduleNowRiskEngineMutation();
  const { addSuccess } = useAppToasts();

  const handleRunEngineClick = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      scheduleNowRiskEngine();
    } catch (error) {
      setIsLoading(false);
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

  const calculateNextRunTime = () => {
    if (runEngineEnabled) {
      const currentTime = new Date();
      const runAtTime = riskEngineStatus?.risk_engine_task_status?.runAt
        ? new Date(riskEngineStatus.risk_engine_task_status.runAt)
        : new Date();
      const minutesUntilNextRun = Math.round((runAtTime.getTime() - currentTime.getTime()) / 60000);
      return `Next engine run in ${minutesUntilNextRun} minutes`;
    }
  };

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
                      onClick={async () => {
                        await handleRunEngineClick();
                        if (!isLoading) {
                          addSuccess(i18n.RISK_SCORE_ENGINE_RUN_SUCCESS, { toastLifeTimeMs: 5000 });
                        }
                      }}
                    >
                      {'Run Engine'}
                    </EuiButton>
                  </EuiFlexItem>
                )}

                {/* Vertical Line */}
                {runEngineEnabled && (
                  <div
                    className="vertical-line"
                    style={{ height: '24px', borderLeft: '1px solid #ccc', margin: '0 8px' }}
                  />
                )}

                {/* Text: "Next engine run in {} minutes" */}
                {runEngineEnabled && (
                  <EuiFlexItem grow={false}>
                    <span style={{ fontSize: '14px', color: '#888888', fontWeight: 'normal' }}>
                      {calculateNextRunTime()}
                    </span>
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
          <IncludeClosedAlertsSection
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
            key={`${from}-${to}-${includeClosedAlerts}`}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

EntityAnalyticsManagementPage.displayName = 'EntityAnalyticsManagementPage';
