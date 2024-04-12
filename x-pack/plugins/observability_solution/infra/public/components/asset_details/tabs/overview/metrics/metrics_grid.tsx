/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexItem, EuiFlexGrid } from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import type { LensConfig } from '@kbn/lens-embeddable-utils/config_builder';
import { Chart } from './chart';

interface Props {
  assetId: string;
  dateRange: TimeRange;
  queryField: string;
  charts: Array<LensConfig & { id: string }>;
  ['data-test-subj']: string;
}

export const MetricsGrid = ({ assetId, dateRange, queryField, charts, ...props }: Props) => {
  return (
    <EuiFlexGrid columns={2} gutterSize="s" data-test-subj={`${props['data-test-subj']}Grid`}>
      {charts.map((chartProp, index) => (
        <EuiFlexItem key={index} grow={false}>
          <Chart
            {...chartProp}
            assetId={assetId}
            dateRange={dateRange}
            queryField={queryField}
            data-test-subj={props['data-test-subj']}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  );
};
