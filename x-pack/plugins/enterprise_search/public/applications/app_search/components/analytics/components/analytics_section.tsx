/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiPageContentBody, EuiTitle, EuiText, EuiSpacer } from '@elastic/eui';

interface Props {
  title: string;
  subtitle: string;
}
export const AnalyticsSection: React.FC<Props> = ({ title, subtitle, children }) => (
  <section>
    <header>
      <EuiTitle size="m">
        <h2>{title}</h2>
      </EuiTitle>
      <EuiText size="s" color="subdued">
        <p>{subtitle}</p>
      </EuiText>
    </header>
    <EuiSpacer size="m" />
    <EuiPageContentBody>{children}</EuiPageContentBody>
  </section>
);
