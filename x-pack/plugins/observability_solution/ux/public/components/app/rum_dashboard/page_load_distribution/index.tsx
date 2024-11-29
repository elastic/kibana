/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { I18LABELS } from '../translations';
import { BreakdownFilter } from '../breakdowns/breakdown_filter';
import { PageLoadDistChart } from '../charts/page_load_dist_chart';
import { ResetPercentileZoom } from './reset_percentile_zoom';
import { BreakdownItem } from '../../../../../typings/ui_filters';
import { PercentileRange } from './types';

export function PageLoadDistribution() {
  const [percentileRange, setPercentileRange] = useState<PercentileRange>({
    min: null,
    max: null,
  });

  const [breakdown, setBreakdown] = useState<BreakdownItem | null>(null);

  const onPercentileChange = useCallback((min: number, max: number) => {
    setPercentileRange({ min, max });
  }, []);

  return (
    <div data-cy="pageLoadDist">
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>{I18LABELS.pageLoadDistribution}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <ResetPercentileZoom
          percentileRange={percentileRange}
          setPercentileRange={setPercentileRange}
        />
        <EuiFlexItem grow={false} style={{ width: 170 }}>
          <BreakdownFilter
            selectedBreakdown={breakdown}
            onBreakdownChange={setBreakdown}
            dataTestSubj={'pldBreakdownFilter'}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <PageLoadDistChart onPercentileChange={onPercentileChange} breakdown={breakdown} />
    </div>
  );
}
