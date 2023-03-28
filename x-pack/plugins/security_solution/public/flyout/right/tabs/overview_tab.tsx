/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiHorizontalRule, EuiPanel } from '@elastic/eui';
import { DescriptionSection } from '../components/description_section';
import { HighlightedFields } from '../components/highlighted_fields';
import { Insights } from '../components/insights';

/**
 * Overview view displayed in the document details expandable flyout right section
 */
export const OverviewTab: FC = memo(() => {
  return (
    <>
      <DescriptionSection />
      <EuiHorizontalRule margin="l" />
      <EuiPanel hasBorder hasShadow={false}>
        <HighlightedFields />
      </EuiPanel>
      <EuiHorizontalRule />
      <Insights />
    </>
  );
});

OverviewTab.displayName = 'OverviewTab';
