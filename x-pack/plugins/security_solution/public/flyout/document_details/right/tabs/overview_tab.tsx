/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiPanel, EuiHorizontalRule } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ResponseSection } from '../components/response_section';
import { InvestigationSection } from '../components/investigation_section';
import { AboutSection } from '../components/about_section';
import { InsightsSection } from '../components/insights_section';
import { VisualizationsSection } from '../components/visualizations_section';

/**
 * Overview view displayed in the document details expandable flyout right section
 */
export const OverviewTab: FC = memo(() => {
  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="none"
      aria-label={i18n.translate(
        'xpack.securitySolution.flyout.right.overview.overviewContentAriaLabel',
        { defaultMessage: 'Overview' }
      )}
    >
      <AboutSection />
      <EuiHorizontalRule margin="m" />
      <InvestigationSection />
      <EuiHorizontalRule margin="m" />
      <VisualizationsSection />
      <EuiHorizontalRule margin="m" />
      <InsightsSection />
      <EuiHorizontalRule margin="m" />
      <ResponseSection />
    </EuiPanel>
  );
});

OverviewTab.displayName = 'OverviewTab';
