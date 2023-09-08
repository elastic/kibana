/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageSectionProps } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';
import React from 'react';

export const ObservabilityLogExplorerPageTemplate = ({
  children,
  observabilityShared,
}: React.PropsWithChildren<{
  observabilityShared: ObservabilitySharedPluginStart;
}>) => (
  <observabilityShared.navigation.PageTemplate pageSectionProps={pageSectionProps}>
    {children}
  </observabilityShared.navigation.PageTemplate>
);

const fullHeightContentStyles = css`
  display: flex;
  flex-direction: column;
  flex: 1 0 auto;
  width: 100%;
  height: 100%;
`;

const pageSectionProps: EuiPageSectionProps = {
  grow: true,
  paddingSize: 'none',
  contentProps: { css: fullHeightContentStyles },
};
