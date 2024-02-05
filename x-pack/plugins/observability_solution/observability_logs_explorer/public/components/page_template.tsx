/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageSectionProps } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { useKibanaContextForPlugin } from '../utils/use_kibana';

export const ObservabilityLogsExplorerPageTemplate = ({
  children,
  pageProps,
}: React.PropsWithChildren<{
  pageProps?: EuiPageSectionProps;
}>) => {
  const {
    services: { observabilityShared },
  } = useKibanaContextForPlugin();

  return (
    <observabilityShared.navigation.PageTemplate
      pageSectionProps={{ ...pageSectionProps, ...pageProps }}
    >
      {children}
    </observabilityShared.navigation.PageTemplate>
  );
};

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
