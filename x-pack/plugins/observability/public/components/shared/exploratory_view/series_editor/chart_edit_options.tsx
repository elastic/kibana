/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Breakdowns } from './columns/breakdowns';
import { SeriesConfig } from '../types';
import { ChartOptions } from './columns/chart_options';

interface Props {
  seriesConfig: SeriesConfig;
  seriesId: string;
  breakdownFields: string[];
}
export function ChartEditOptions({ seriesConfig, seriesId, breakdownFields }: Props) {
  return (
    <EuiFlexGroup wrap>
      <EuiFlexItem>
        <Breakdowns seriesId={seriesId} breakdowns={breakdownFields} seriesConfig={seriesConfig} />
      </EuiFlexItem>
      <EuiFlexItem>
        <ChartOptions seriesConfig={seriesConfig} seriesId={seriesId} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
