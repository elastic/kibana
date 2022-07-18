/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBadge, EuiText, useEuiTheme } from '@elastic/eui';

export interface RuleActionErrorBadge {
  totalErrors: number;
  showIcon?: boolean;
}

export const RuleActionErrorBadge = (props: RuleActionErrorBadge) => {
  const { totalErrors, showIcon = false } = props;
  const { euiTheme } = useEuiTheme();

  const badgeStyle = useMemo(
    () => ({
      color: 'white',
      borderRadius: '24px',
    }),
    []
  );

  const textStyle = useMemo(
    () => ({
      fontWeight: euiTheme.font.weight.semiBold,
    }),
    [euiTheme]
  );

  return (
    <EuiBadge style={badgeStyle} iconType={showIcon ? 'alert' : undefined} color="accent">
      <EuiText color="white" size="s" style={textStyle}>
        {totalErrors}
      </EuiText>
    </EuiBadge>
  );
};
