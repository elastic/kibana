/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiCard, EuiFlexItem, EuiLink, EuiTitle } from '@elastic/eui';

import { useRoutes } from '../shared/use_routes';

interface IStatisticCardProps {
  title: string;
  count?: number;
  actionPath?: string;
}

export const StatisticCard: React.FC<IStatisticCardProps> = ({ title, count = 0, actionPath }) => {
  const { getWSRoute } = useRoutes();
  const actionRoute = getWSRoute(actionPath);

  const card = (
    <EuiFlexItem>
      <EuiCard
        className={actionPath ? 'euiCard--isClickable' : ''}
        layout="horizontal"
        title={title}
        titleSize="xs"
        description={
          <EuiTitle size="l">
            <span>
              <span className={`euiTextColor euiTextColor--${actionPath ? 'primary' : 'subdued'}`}>
                {count}
              </span>
            </span>
          </EuiTitle>
        }
      />
    </EuiFlexItem>
  );

  return (
    <EuiFlexItem>
      {actionPath ? (
        <EuiLink target="_blank" href={actionRoute}>
          {card}
        </EuiLink>
      ) : (
        card
      )}
    </EuiFlexItem>
  );
};
