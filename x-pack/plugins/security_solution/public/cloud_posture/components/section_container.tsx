/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiAccordion, EuiPanel, EuiSpacer, EuiTitle, EuiButton } from '@elastic/eui';
import React from 'react';
import { ErrorPanel } from './error_panel';

interface AppLink {
  label: string;
  href?: string;
}

interface SectionContainerProps {
  title: string;
  children: React.ReactNode;
  hasBorder?: boolean;
  initialIsOpen?: boolean;
  appLink?: AppLink;
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
