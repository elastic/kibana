/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';

export function SideHeader({ children }: PropsWithChildren<{}>) {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiFlexGroup
        alignItems="center"
        css={css`
          height: ${euiTheme.size.xxl};
        `}
      >
        <EuiFlexItem>{children}</EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="s" />
    </>
  );
}
