/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import type { VFC } from 'react';
import React from 'react';
import { ExpandableSection } from './expandable_section';
import { DESCRIPTION_SECTION_TEST_ID } from './test_ids';
import { DESCRIPTION_TITLE } from './translations';
import { Description } from './description';
import { Reason } from './reason';
import { MitreAttack } from './mitre_attack';

export interface DescriptionSectionProps {
  /**
   * Boolean to allow the component to be expanded or collapsed on first render
   */
  expanded?: boolean;
}

/**
 * Most top section of the overview tab. It contains the description, reason and mitre attack information (for a document of type alert).
 */
export const DescriptionSection: VFC<DescriptionSectionProps> = ({ expanded = true }) => {
  return (
    <ExpandableSection
      expanded={expanded}
      title={DESCRIPTION_TITLE}
      data-test-subj={DESCRIPTION_SECTION_TEST_ID}
    >
      <Description />
      <EuiSpacer size="m" />
      <Reason />
      <EuiSpacer size="m" />
      <MitreAttack />
    </ExpandableSection>
  );
};

DescriptionSection.displayName = 'DescriptionSection';
