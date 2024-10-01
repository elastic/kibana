/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageTemplate, EuiPanel, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { Footer } from '../footer/footer';
import { Header } from '../header';

interface TemplateProps {
  customHeader?: React.ReactNode;
}

export const PageTemplate: React.FC<React.PropsWithChildren<TemplateProps>> = ({
  children,
  customHeader,
}) => {
  return (
    <EuiPageTemplate
      css={css`
        padding-top: 0px !important;
      `}
    >
      {!!customHeader ? customHeader : <Header />}
      <EuiPageTemplate.Section paddingSize="xl" color="subdued" restrictWidth>
        {children}
      </EuiPageTemplate.Section>
      <EuiSpacer size="xl" />
      <EuiPageTemplate.Section
        contentProps={{ css: { paddingBlock: 0 } }}
        css={css`
          padding-inline: 0px;
        `}
      >
        <EuiPanel
          hasBorder
          css={css`
            border-radius: 0px;
            border-left: none;
            border-bottom: none;
            border-right: none;
          `}
        >
          <Footer />
          <EuiSpacer size="xl" />
        </EuiPanel>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
