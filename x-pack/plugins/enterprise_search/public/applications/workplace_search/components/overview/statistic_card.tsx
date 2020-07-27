/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiCard, EuiFlexItem, EuiTitle, EuiTextColor } from '@elastic/eui';

import { useRoutes } from '../shared/use_routes';

interface IStatisticCardProps {
  title: string;
  count?: number;
  actionPath?: string;
}

export const StatisticCard: React.FC<IStatisticCardProps> = ({ title, count = 0, actionPath }) => {
  const { getWSRoute } = useRoutes();

  const linkProps = actionPath
    ? {
        href: getWSRoute(actionPath),
        target: '_blank',
        rel: 'noopener',
      }
    : {};
  // TODO: When we port this destination to Kibana, we'll want to create a EuiReactRouterCard component (see shared/react_router_helpers/eui_link.tsx)

  return (
    <EuiFlexItem>
      <EuiCard
        {...linkProps}
        layout="horizontal"
        title={title}
        titleSize="xs"
        description={
          <EuiTitle size="l">
            <EuiTextColor color={actionPath ? 'default' : 'subdued'}>{count}</EuiTextColor>
          </EuiTitle>
        }
      />
    </EuiFlexItem>
  );
};
