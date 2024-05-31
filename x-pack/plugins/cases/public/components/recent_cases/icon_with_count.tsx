/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';

export const IconWithCount = React.memo<{
  count: number;
  icon: string;
  tooltip: string;
}>(({ count, icon, tooltip }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <span
      css={css`
        width: fit-content;
      `}
    >
      <EuiToolTip content={tooltip}>
        <EuiFlexGroup
          alignItems="center"
          gutterSize="none"
          css={css`
            margin-right: ${euiTheme.size.base};
          `}
        >
          <EuiFlexItem grow={false}>
            <EuiIcon
              css={css`
                margin-right: ${euiTheme.size.xs};
              `}
              color="default"
              size="s"
              type={icon}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiText color="default" size="xs">
              {count}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiToolTip>
    </span>
  );
});

IconWithCount.displayName = 'IconWithCount';
