/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, type CommonProps } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

// Keep this component lean as it is part of the main app bundle
export const FullSizeCenteredPage = ({
  children,
  ...rest
}: { children: React.ReactNode } & CommonProps) => (
  <EuiFlexGroup
    css={css`
      // 140px is roughly the Kibana chrome with a bit of space to spare
      min-height: calc(100vh - 140px);
    `}
    justifyContent="center"
    alignItems="center"
    direction="column"
    {...rest}
  >
    {children}
  </EuiFlexGroup>
);
