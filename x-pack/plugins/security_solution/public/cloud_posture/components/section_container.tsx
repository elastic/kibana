/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAccordion, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';

interface SectionContainerProps {
  title: string;
  children: React.ReactNode;
  hasBorder?: boolean;
  initialIsOpen?: boolean;
}

export const SectionContainer = ({
  title,
  children,
  hasBorder = true,
  initialIsOpen = false,
}: SectionContainerProps) => (
  <EuiPanel hasBorder={hasBorder}>
    <EuiAccordion
      initialIsOpen={initialIsOpen}
      id={title}
      buttonContentClassName="accordion-button"
      buttonContent={
        <EuiTitle size="s">
          <h5>{title}</h5>
        </EuiTitle>
      }
    >
      <EuiSpacer size="s" />
      <EuiPanel hasShadow={false} paddingSize="s">
        {children}
      </EuiPanel>
    </EuiAccordion>
  </EuiPanel>
);
