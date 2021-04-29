/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Breakdowns } from './columns/breakdowns';
import { DataSeries } from '../types';
import { ChartOptions } from './columns/chart_options';

interface Props {
  series: DataSeries;
  seriesId: string;
  breakdowns: string[];
}
export function ChartEditOptions({ series, seriesId, breakdowns }: Props) {
  return (
    <EuiFlexGroup wrap>
      <EuiFlexItem>
        <Breakdowns seriesId={seriesId} breakdowns={breakdowns} />
      </EuiFlexItem>
      <EuiFlexItem>
        <ChartOptions series={series} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
