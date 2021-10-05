/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { ResultAction } from './types';

interface Props {
  actions: ResultAction[];
}

export const ResultActions: React.FC<Props> = ({ actions }) => {
  return (
    <EuiFlexGroup gutterSize="s" responsive={false}>
      {actions.map(({ onClick, title, iconType, iconColor }) => (
        <EuiFlexItem key={title} grow={false}>
          <EuiButtonIcon
            iconType={iconType}
            onClick={onClick}
            color={iconColor ? iconColor : 'primary'}
            aria-label={title}
            title={title}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
