/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCard, EuiFlexItem, EuiTitle, EuiTextColor } from '@elastic/eui';

import { EuiCardTo } from '../../../shared/react_router_helpers';

interface StatisticCardProps {
  title: string;
  count?: number;
  actionPath?: string;
}

export const StatisticCard: React.FC<StatisticCardProps> = ({ title, count = 0, actionPath }) => {
  const linkableCard = (
    <EuiCardTo
      to={actionPath || ''}
      layout="horizontal"
      title={title}
      titleSize="xs"
      display="plain"
      hasBorder
      description={
        <EuiTitle size="l">
          <EuiTextColor color="default">{count}</EuiTextColor>
        </EuiTitle>
      }
    />
  );
  const card = (
    <EuiCard
      layout="horizontal"
      title={title}
      titleSize="xs"
      display="subdued"
      description={
        <EuiTitle size="l">
          <EuiTextColor color="subdued">{count}</EuiTextColor>
        </EuiTitle>
      }
    />
  );

  return <EuiFlexItem>{actionPath ? linkableCard : card}</EuiFlexItem>;
};
