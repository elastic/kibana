/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { I18LABELS } from '../translations';
import { BreakdownFilter } from '../breakdowns/breakdown_filter';
import { PageLoadDistChart } from '../charts/page_load_dist_chart';
import { ResetPercentileZoom } from './reset_percentile_zoom';
import { BreakdownItem } from '../../../../../typings/ui_filters';
import { PercentileRange } from './types';
import { usePageLoadDistribution } from '../../../../services/data/page_load_distribution_query';
import { useDataView } from '../local_uifilters/use_data_view';

export function PageLoadDistribution() {
<<<<<<< HEAD
=======
  const { http } = useKibanaServices();

  const { dataViewTitle } = useDataView();
  const { rangeId, urlParams, uxUiFilters } = useLegacyUrlParams();

  const { start, end, rangeFrom, rangeTo } = urlParams;

  const { serviceName } = uxUiFilters;

>>>>>>> Migrate breakdowns to use data plugin.
  const [percentileRange, setPercentileRange] = useState<PercentileRange>({
    min: null,
    max: null,
  });

  const [breakdown, setBreakdown] = useState<BreakdownItem | null>(null);

  const onPercentileChange = (min: number, max: number) => {
    setPercentileRange({ min, max });
  };

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
      <PageLoadDistChart
<<<<<<< HEAD
=======
        data={
          loading
            ? null
            : { pageLoadDistribution, percentiles, minDuration, maxDuration }
        }
        dataViewTitle={dataViewTitle}
>>>>>>> Migrate breakdowns to use data plugin.
        onPercentileChange={onPercentileChange}
        breakdown={breakdown}
      />
    </div>
  );
}
