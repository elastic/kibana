/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VFC } from 'react';
import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { ExpandableSection } from './expandable_section';
import { HighlightedFields } from './highlighted_fields';
import { INVESTIGATION_SECTION_TEST_ID } from './test_ids';
import { INVESTIGATION_TITLE } from './translations';
import { InvestigationGuide } from './investigation_guide';
export interface DescriptionSectionProps {
  /**
   * Boolean to allow the component to be expanded or collapsed on first render
   */
  expanded?: boolean;
}

/**
 * Most top section of the overview tab. It contains the description, reason and mitre attack information (for a document of type alert).
 */
export const InvestigationSection: VFC<DescriptionSectionProps> = ({ expanded = true }) => {
  return (
    <ExpandableSection
      expanded={expanded}
      title={INVESTIGATION_TITLE}
      data-test-subj={INVESTIGATION_SECTION_TEST_ID}
    >
      <InvestigationGuide />
      <EuiSpacer size="m" />
      <HighlightedFields />
    </ExpandableSection>
  );
};

InvestigationSection.displayName = 'InvestigationSection';
