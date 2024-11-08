/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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

export const EntityAnalyticsManagementPage = () => {
  const privileges = useMissingRiskEnginePrivileges();
  // const handleStatusChange = (isEnabled) => {
  //   setIsRiskEngineEnabled(isEnabled);
  // };
  const showItem = true;
  const { euiTheme } = useEuiTheme();
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
                {/* Toggle Button */}
                <EuiFlexItem grow={false}>
                  <RiskScoreEnableSection privileges={privileges} />
                </EuiFlexItem>

                {/* Text: "Next engine run in 14 minutes" */}
                {showItem && (
                  <EuiFlexItem grow={false}>
                    <span style={{ fontSize: '14px', color: '#888888', fontWeight: 'normal' }}>
                      {'Next engine run in 14 minutes'}
                    </span>
                  </EuiFlexItem>
                )}

                {/* Vertical Line */}
                {showItem && (
                  <div
                    className="vertical-line"
                    style={{ height: '24px', borderLeft: '1px solid #ccc', margin: '0 8px' }}
                  />
                )}

                {/* Run Engine Button */}
                {showItem && (
                  <EuiFlexItem grow={false}>
                    <EuiButton size="s" iconType="play">
                      {'Run Engine'}
                    </EuiButton>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      />

      <EuiHorizontalRule />

      <EuiFlexGroup gutterSize="xl" alignItems="flexStart">
        <EuiFlexItem grow={2}>
          <IncludeClosedAlertsSection />
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
          <RiskScorePreviewSection privileges={privileges} isRiskEngineEnabled={true} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

EntityAnalyticsManagementPage.displayName = 'EntityAnalyticsManagementPage';
