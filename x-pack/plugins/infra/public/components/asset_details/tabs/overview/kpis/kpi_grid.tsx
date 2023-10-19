/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { assetDetailsDashboards, KPI_CHART_HEIGHT } from '../../../../../common/visualizations';
import { Kpi } from './kpi';

interface Props {
  dataView?: DataView;
  assetName: string;
  dateRange: TimeRange;
}

export const KPIGrid = ({ assetName, dataView, dateRange }: Props) => {
  return (
    <EuiFlexGroup direction="row" gutterSize="s" data-test-subj="infraAssetDetailsKPIGrid">
      {assetDetailsDashboards.host.hostKPICharts.map((chartProps, index) => (
        <EuiFlexItem key={index}>
          <Kpi
            {...chartProps}
            dateRange={dateRange}
            assetName={assetName}
            dataView={dataView}
            height={KPI_CHART_HEIGHT}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
