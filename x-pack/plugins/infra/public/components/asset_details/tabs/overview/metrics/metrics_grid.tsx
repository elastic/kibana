/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { EuiFlexItem, EuiFlexGrid } from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import {
  type XYConfig,
  XY_MISSING_VALUE_DOTTED_LINE_CONFIG,
} from '../../../../../common/visualizations';
import { useMetadataStateProviderContext } from '../../../hooks/use_metadata_state';
import { Chart } from './chart';

interface Props {
  assetName: string;
  dateRange: TimeRange;
  metricsDataView?: DataView;
  logsDataView?: DataView;
  filterFieldName: string;
  charts: Array<XYConfig & { dependsOn?: string[] }>;
  ['data-test-subj']: string;
}

export const MetricsGrid = ({
  assetName,
  metricsDataView,
  logsDataView,
  dateRange,
  filterFieldName,
  charts,
  ...props
}: Props) => {
  const { metadata } = useMetadataStateProviderContext();

  const chartsToRender = useMemo(
    () =>
      charts.filter(
        (c) =>
          !c.dependsOn ||
          c.dependsOn.every((d) => (metadata?.features ?? []).some((f) => d === f.name))
      ),
    [charts, metadata?.features]
  );

  return (
    <EuiFlexGrid columns={2} gutterSize="s" data-test-subj={`${props['data-test-subj']}Grid`}>
      {chartsToRender.map((chartProp, index) => (
        <EuiFlexItem key={index} grow={false}>
          <Chart
            {...chartProp}
            assetName={assetName}
            dateRange={dateRange}
            filterFieldName={filterFieldName}
            logsDataView={logsDataView}
            metricsDataView={metricsDataView}
            data-test-subj={props['data-test-subj']}
            visualOptions={XY_MISSING_VALUE_DOTTED_LINE_CONFIG}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  );
};
