/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import type { DashboardAPI } from '@kbn/dashboard-plugin/public';
import React from 'react';
import { useBadges } from '../hooks/use_badges';

const DashboardTitleBadgesComponent: React.FC<{ dashboardContainer: DashboardAPI }> = ({
  dashboardContainer,
}) => {
  const badges = useBadges({ dashboardContainer });

  return badges ? (
    <>
      {badges?.map(({ toolTipProps, ...b }) => (
        <EuiToolTip key={b['data-test-subj']} {...toolTipProps}>
          <EuiBadge className="eui-alignMiddle" key={b['data-test-subj']} {...b}>
            {b.badgeText}
          </EuiBadge>
        </EuiToolTip>
      ))}
    </>
  ) : null;
};
DashboardTitleBadgesComponent.displayName = 'DashboardTitleBadges';

export const DashboardTitleBadges = React.memo(DashboardTitleBadgesComponent);
