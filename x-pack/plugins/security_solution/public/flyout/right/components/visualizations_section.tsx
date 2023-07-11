/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { ExpandableSection } from './expandable_section';
import { VISUALIZATIONS_SECTION_TEST_ID } from './test_ids';
import { VISUALIZATIONS_TITLE } from './translations';
import { AnalyzerPreview } from './analyzer_preview';
import { SessionPreview } from './session_preview';

export interface VisualizatioinsSectionProps {
  /**
   * Boolean to allow the component to be expanded or collapsed on first render
   */
  expanded?: boolean;
}

/**
 * Visualizations section in overview. It contains analyzer preview and session view preview.
 */
export const VisualizationsSection: React.FC<VisualizatioinsSectionProps> = ({
  expanded = false,
}) => {
  return (
    <ExpandableSection
      expanded={expanded}
      title={VISUALIZATIONS_TITLE}
      data-test-subj={VISUALIZATIONS_SECTION_TEST_ID}
    >
      <SessionPreview />

      <EuiSpacer />

      <AnalyzerPreview />
    </ExpandableSection>
  );
};

VisualizationsSection.displayName = 'VisualizationsSection';
