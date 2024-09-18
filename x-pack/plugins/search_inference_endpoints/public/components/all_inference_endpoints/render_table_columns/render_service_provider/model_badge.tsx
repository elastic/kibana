/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiText, useEuiTheme } from '@elastic/eui';

interface ModelBadgeProps {
  model?: string;
}

export const ModelBadge: React.FC<ModelBadgeProps> = ({ model }) => {
  const { euiTheme } = useEuiTheme();

  if (!model) return null;

  return (
    <EuiBadge color={euiTheme.colors.body}>
      <EuiText size="s" color="subdued">
        {model}
      </EuiText>
    </EuiBadge>
  );
};
