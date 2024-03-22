/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';

import type { StatItems } from '../stat_items';
import { StatItemsComponent } from '../stat_items';

interface KpiBaseComponentProps {
  from: string;
  id: string;
  statItems: Readonly<StatItems[]>;
  to: string;
}

export const KpiBaseComponent = React.memo<KpiBaseComponentProps>(({ statItems, ...props }) => (
  <EuiFlexGroup wrap>
    {statItems.map((statItem) => (
      <StatItemsComponent {...props} key={`kpi-base-${statItem.key}`} statItems={statItem} />
    ))}
  </EuiFlexGroup>
));

KpiBaseComponent.displayName = 'KpiBaseComponent';
