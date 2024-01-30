/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import type { VFC } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { ExpandableSection } from './expandable_section';
import { ABOUT_SECTION_TEST_ID } from './test_ids';
import { Description } from './description';
import { Reason } from './reason';
import { MitreAttack } from './mitre_attack';

export interface AboutSectionProps {
  /**
   * Boolean to allow the component to be expanded or collapsed on first render
   */
  expanded?: boolean;
}

/**
 * Most top section of the overview tab. It contains the description, reason and mitre attack information (for a document of type alert).
 */
export const AboutSection: VFC<AboutSectionProps> = ({ expanded = true }) => {
  return (
    <ExpandableSection
      expanded={expanded}
      title={
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.about.sectionTitle"
          defaultMessage="About"
        />
      }
      data-test-subj={ABOUT_SECTION_TEST_ID}
    >
      <Description />
      <EuiSpacer size="m" />
      <Reason />
      <MitreAttack />
    </ExpandableSection>
  );
};

AboutSection.displayName = 'AboutSection';
