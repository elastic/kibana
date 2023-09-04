/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VFC } from 'react';
import React from 'react';
import { ResponseButton } from './response_button';
import { ExpandableSection } from './expandable_section';
import { RESPONSE_SECTION_TEST_ID } from './test_ids';
import { RESPONSE_TITLE } from './translations';
export interface ResponseSectionProps {
  /**
   * Boolean to allow the component to be expanded or collapsed on first render
   */
  expanded?: boolean;
}

/**
 * Most bottom section of the overview tab. It contains a summary of the response tab.
 */
export const ResponseSection: VFC<ResponseSectionProps> = ({ expanded = false }) => {
  return (
    <ExpandableSection
      expanded={expanded}
      title={RESPONSE_TITLE}
      data-test-subj={RESPONSE_SECTION_TEST_ID}
    >
      <ResponseButton />
    </ExpandableSection>
  );
};

ResponseSection.displayName = 'ResponseSection';
