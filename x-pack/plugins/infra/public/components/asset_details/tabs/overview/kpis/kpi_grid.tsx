/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { LensChart, TooltipContent } from '../../../../lens';
import { buildCombinedHostsFilter } from '../../../../../utils/filters/build';
import {
  assetDetailsDashboards,
  KPI_CHART_HEIGHT,
  AVERAGE_SUBTITLE,
} from '../../../../../common/visualizations';

interface Props {
  dataView?: DataView;
  nodeName: string;
  timeRange: TimeRange;
}

export const KPIGrid = React.memo(({ nodeName, dataView, timeRange }: Props) => {
  const filters = useMemo(() => {
    return [
      buildCombinedHostsFilter({
        field: 'host.name',
        values: [nodeName],
        dataView,
      }),
    ];
  }, [dataView, nodeName]);

  return (
    <EuiFlexGroup direction="row" gutterSize="s" data-test-subj="infraAssetDetailsKPIGrid">
      {assetDetailsDashboards.host.hostKPICharts.map(({ id, layers, title, toolTip }, index) => (
        <EuiFlexItem key={index}>
          <LensChart
            id={`infraAssetDetailsKPI${id}`}
            dataView={dataView}
            dateRange={timeRange}
            layers={{ ...layers, options: { ...layers.options, subtitle: AVERAGE_SUBTITLE } }}
            height={KPI_CHART_HEIGHT}
            filters={filters}
            title={title}
            toolTip={<TooltipContent description={toolTip} />}
            visualizationType="lnsMetric"
            disableTriggers
            hidePanelTitles
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
});
