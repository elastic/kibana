/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiFlexGrid,
  EuiHorizontalRule,
  EuiTitle,
  EuiFlexItem,
  useGeneratedHtmlId,
} from '@elastic/eui';

interface HighlightSectionProps {
  title: string;
  children: React.ReactNode;
  showBottomRule?: boolean;
  columns: 1 | 2 | 3;
}

export function HighlightSection({
  title,
  children,
  showBottomRule = true,
  columns,
}: HighlightSectionProps) {
  const validChildren = React.Children.toArray(children).filter(Boolean);
  const shouldRenderSection = validChildren.length > 0;
  const accordionTitle = (
    <EuiTitle size="xs">
      <p>{title}</p>
    </EuiTitle>
  );

  const flexChildren = validChildren.map((child, idx) => (
    <EuiFlexItem key={idx}>{child}</EuiFlexItem>
  ));

  const accordionId = useGeneratedHtmlId({
    prefix: title,
  });

  return shouldRenderSection ? (
    <>
      <EuiAccordion
        id={accordionId}
        buttonContent={accordionTitle}
        paddingSize="s"
        initialIsOpen={true}
        data-test-subj={`logExplorerFlyoutHighlightSection${title}`}
      >
        <EuiFlexGrid columns={columns}>{flexChildren}</EuiFlexGrid>
      </EuiAccordion>
      {showBottomRule && <EuiHorizontalRule margin="xs" />}
    </>
  ) : null;
}
