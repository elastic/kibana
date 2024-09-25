/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAccordion, EuiSplitPanel, useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';
import { css } from '@emotion/css';
import type { PropsWithChildren } from 'react';

interface SplitAccordionProps {
  header: React.ReactNode;
  initialIsOpen?: boolean;
  'data-test-subj'?: string;
}

export const SplitAccordion = ({
  header,
  initialIsOpen,
  'data-test-subj': dataTestSubj,
  children,
}: PropsWithChildren<SplitAccordionProps>) => {
  const accordionId = useGeneratedHtmlId();
  const { euiTheme } = useEuiTheme();

  return (
    <EuiSplitPanel.Outer data-test-subj={`${dataTestSubj}Wrapper`} hasBorder>
      <EuiAccordion
        id={accordionId}
        initialIsOpen={initialIsOpen}
        css={css`
          .euiAccordion__triggerWrapper {
            background: ${euiTheme.colors.lightestShade};
            padding: ${euiTheme.size.m};
          }
        `}
        buttonContent={header}
      >
        <EuiSplitPanel.Inner data-test-subj={`${dataTestSubj}Content`} color="transparent">
          {children}
        </EuiSplitPanel.Inner>
      </EuiAccordion>
    </EuiSplitPanel.Outer>
  );
};
