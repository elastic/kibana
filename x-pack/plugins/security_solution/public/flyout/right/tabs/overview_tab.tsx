/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiHorizontalRule } from '@elastic/eui';
import { InvestigationSection } from '../components/investigation_section';
import { DescriptionSection } from '../components/description_section';
import { InsightsSection } from '../components/insights_section';
import { VisualizationsSection } from '../components/visualizations_section';

/**
 * Overview view displayed in the document details expandable flyout right section
 */
export const OverviewTab: FC = memo(() => {
  return (
    <>
      <DescriptionSection />
      <EuiHorizontalRule margin="l" />
      <InvestigationSection />
      <EuiHorizontalRule margin="l" />
      <InsightsSection />
      <EuiHorizontalRule margin="l" />
      <VisualizationsSection />
    </>
  );
});

OverviewTab.displayName = 'OverviewTab';
