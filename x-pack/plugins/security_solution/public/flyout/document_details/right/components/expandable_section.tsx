/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiFlexGroup, EuiSpacer, EuiTitle, useGeneratedHtmlId } from '@elastic/eui';
import type { EuiFlexGroupProps } from '@elastic/eui';
import type { ReactElement } from 'react';
import React, { type VFC } from 'react';
import { useAccordionState } from '../hooks/use_accordion_state';

export const HEADER_TEST_ID = 'Header';
export const CONTENT_TEST_ID = 'Content';

export interface DescriptionSectionProps {
  /**
   * Boolean to allow the component to be expanded or collapsed on first render
   */
  expanded: boolean;
  /**
   * Title value to render in the header of the accordion
   */
  title: ReactElement;
  /**
   * Gutter size between contents in expandable section
   */
  gutterSize?: EuiFlexGroupProps['gutterSize'];
  /**
   * React component to render in the expandable section of the accordion
   */
  children: React.ReactNode;
  /**
   * Prefix data-test-subj to use for the header and expandable section of the accordion
   */
  ['data-test-subj']?: string;
}

/**
 * Component used to render multiple sections in the Overview tab
 * - About
 * - Investigation
 * - Visualizations
 * - Insights
 */
export const ExpandableSection: VFC<DescriptionSectionProps> = ({
  expanded,
  title,
  children,
  gutterSize = 'none',
  'data-test-subj': dataTestSub,
}) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'accordion' });

  const { renderContent, toggle, state } = useAccordionState(expanded);

  const headerDataTestSub = dataTestSub + HEADER_TEST_ID;
  const contentDataTestSub = dataTestSub + CONTENT_TEST_ID;

  const header = (
    <EuiTitle size="xs" data-test-subj={headerDataTestSub}>
      <h4>{title}</h4>
    </EuiTitle>
  );

  return (
    <EuiAccordion forceState={state} onToggle={toggle} id={accordionId} buttonContent={header}>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize={gutterSize} direction="column" data-test-subj={contentDataTestSub}>
        {renderContent && children}
      </EuiFlexGroup>
    </EuiAccordion>
  );
};

ExpandableSection.displayName = 'ExpandableSection';
