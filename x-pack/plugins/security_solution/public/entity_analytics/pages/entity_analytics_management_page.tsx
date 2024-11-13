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
import { IncludeClosedAlertsSection } from '../components/include_closed_alerts_section';
import { RiskScoreUsefulLinksSection } from '../components/risk_score_useful_links_section';
import { ENTITY_ANALYTICS_RISK_SCORE } from '../../app/translations';
import { RiskEnginePrivilegesCallOut } from '../components/risk_engine_privileges_callout';
import { useMissingRiskEnginePrivileges } from '../hooks/use_missing_risk_engine_privileges';
// /Users/abhishekbhatia/Work/elastic/kibana/x-pack/plugins/security_solution/public/entity_analytics/api/hooks/use_risk_engine_status.ts
import { useRiskEngineStatus } from '../api/hooks/use_risk_engine_status';
import { useInitRiskEngineMutation } from '../api/hooks/use_init_risk_engine_mutation';

export const EntityAnalyticsManagementPage = () => {
  const privileges = useMissingRiskEnginePrivileges();
  const [includeClosedAlerts, setIncludeClosedAlerts] = useState(false);
  const { euiTheme } = useEuiTheme();
  const { data: riskEngineStatus } = useRiskEngineStatus();
  const currentRiskEngineStatus = riskEngineStatus?.risk_engine_status;
  const runEngineEnabled = currentRiskEngineStatus === 'ENABLED';
  const [from, setFrom] = useState('now-30m');
  const [to, setTo] = useState('now');
  const { mutate: initRiskEngine } = useInitRiskEngineMutation();
  const [isLoading, setIsLoading] = useState(false);

  const handleRunEngineClick = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      initRiskEngine({
        includeClosedAlerts,
        range: { start: from, end: to },
      });
    } catch (error) {
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (value: boolean) => {
    setIncludeClosedAlerts(value);
  };

  const handleDateChange = ({ start, end }: { start: string; end: string }) => {
    setFrom(start);
    setTo(end);
  };

  const calculateNextRunTime = () => {
    const now = new Date();
    const nextRun = new Date(now.getTime() + (60 - now.getMinutes()) * 60000);
    const minutesUntilNextRun = Math.round((nextRun.getTime() - now.getTime()) / 60000);
    return `Next engine run in ${minutesUntilNextRun} minutes`;
  };

  return (
    <>
      <RiskEnginePrivilegesCallOut privileges={privileges} />
      <EuiPageHeader
        pageTitle={
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            {/* Left-aligned Page Title */}
            <EuiFlexItem data-test-subj="entityAnalyticsManagementPageTitle" grow={false}>
              {ENTITY_ANALYTICS_RISK_SCORE}
            </EuiFlexItem>

            {/* Right-aligned group with toggle, text, vertical line, and button */}
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

                {/* Text: "Next engine run in 14 minutes" */}
                {runEngineEnabled && (
                  <EuiFlexItem grow={false}>
                    <span style={{ fontSize: '14px', color: '#888888', fontWeight: 'normal' }}>
                      {calculateNextRunTime()}
                    </span>
                  </EuiFlexItem>
                )}

                {/* Toggle Button */}
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
            setIncludeClosedAlerts={handleToggle}
            from={from}
            to={to}
            onDateChange={handleDateChange}
          />
          <EuiHorizontalRule />
          <RiskScoreUsefulLinksSection />
        </EuiFlexItem>

        <EuiFlexItem
          grow={2}
          style={{
            justifyContent: 'center',
            border: `${euiTheme.border.thin}`,
            borderRadius: '6px',
            padding: '20px',
          }}
        >
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
