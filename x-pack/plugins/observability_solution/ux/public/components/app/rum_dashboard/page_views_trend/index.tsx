/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import React, { useState } from 'react';
import { BreakdownItem } from '../../../../../typings/ui_filters';
import { BreakdownFilter } from '../breakdowns/breakdown_filter';
import { PageViewsChart } from '../charts/page_views_chart';
import { I18LABELS } from '../translations';

export function PageViewsTrend() {
  const [breakdown, setBreakdown] = useState<BreakdownItem | null>(null);

  return (
    <div className="pageViewsChart">
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>{I18LABELS.pageViews}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ width: 170 }}>
          <BreakdownFilter
            selectedBreakdown={breakdown}
            onBreakdownChange={setBreakdown}
            dataTestSubj={'pvBreakdownFilter'}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <PageViewsChart breakdown={breakdown} />
    </div>
  );
}
