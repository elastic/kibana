/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ENTITY_ANALYTICS_MANAGEMENT } from '../../app/translations';
import { AdministrationListPage } from '../../management/components/administration_list_page';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { RiskScorePreviewSection } from '../components/risk_score_preview_section';
import { RiskScoreEnableSection } from '../components/risk_score_enable_section';

export const EntityAnalyticsManagementPage = () => {
  return (
    <AdministrationListPage
      data-test-subj="responseActionsPage"
      title={ENTITY_ANALYTICS_MANAGEMENT}
    >
      <EuiFlexGroup gutterSize="xl">
        <EuiFlexItem grow={3}>
          <RiskScoreEnableSection />
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <RiskScorePreviewSection />
        </EuiFlexItem>
      </EuiFlexGroup>
    </AdministrationListPage>
  );
};

EntityAnalyticsManagementPage.displayName = 'EntityAnalyticsManagementPage';
