/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem, EuiPageHeader, EuiSpacer } from '@elastic/eui';

import { RiskScorePreviewSection } from '../components/risk_score_preview_section';
import { RiskScoreEnableSection } from '../components/risk_score_enable_section';
import { ENTITY_ANALYTICS_RISK_SCORE } from '../../app/translations';
import { BETA } from '../../common/translations';

export const EntityAnalyticsManagementPage = () => {
  return (
    <>
      <EuiFlexGroup gutterSize="s" alignItems="baseline">
        <EuiFlexItem grow={false}>
          <EuiPageHeader
            data-test-subj="entityAnalyticsManagementPageTitle"
            pageTitle={ENTITY_ANALYTICS_RISK_SCORE}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false} />
        <EuiBetaBadge label={BETA} size="s" />
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      <EuiFlexGroup gutterSize="xl">
        <EuiFlexItem grow={2}>
          <RiskScoreEnableSection />
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <RiskScorePreviewSection />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

EntityAnalyticsManagementPage.displayName = 'EntityAnalyticsManagementPage';
