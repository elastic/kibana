/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiTitle, useEuiTheme, EuiPanelProps } from '@elastic/eui';
import React from 'react';

export const PanelWithTitle: React.FC<
  { title?: string; titleLeftAlign?: boolean } & EuiPanelProps
> = ({ title, hasBorder = true, hasShadow = false, children, titleLeftAlign, ...props }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel hasBorder={hasBorder} hasShadow={hasShadow} {...props}>
      {title && (
        <EuiTitle size="xs">
          <h3
            css={{
              margin: euiTheme.size.s,
              marginBottom: 0,
              ...(titleLeftAlign ? { marginLeft: 0 } : {}),
            }}
          >
            {title}
          </h3>
        </EuiTitle>
      )}
      {children}
    </EuiPanel>
  );
};
