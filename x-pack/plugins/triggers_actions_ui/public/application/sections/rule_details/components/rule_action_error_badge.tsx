/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiText } from '@elastic/eui';

export interface RuleActionErrorBadge {
  totalErrors: number;
  showIcon?: boolean;
}

export const RuleActionErrorBadge = (props: RuleActionErrorBadge) => {
  const { totalErrors, showIcon = false } = props;

  return (
    <EuiBadge
      iconType={showIcon ? 'alert' : undefined}
      color={totalErrors ? 'danger' : 'hollow'}
      data-test-subj="ruleActionErrorBadge"
    >
      <EuiText size="s">{totalErrors}</EuiText>
    </EuiBadge>
  );
};
