/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import {
  findInventoryFields,
  type InventoryItemType,
} from '@kbn/metrics-data-access-plugin/common';
import { buildCombinedAssetFilter } from '../../../../utils/filters/build';
import { useSearchSessionContext } from '../../../../hooks/use_search_session';
import { useLogsCharts } from '../../hooks/use_log_charts';
import { Kpi } from '../../components/kpis/kpi';

interface Props {
  dataView?: DataView;
  assetId: string;
  assetType: InventoryItemType;
  dateRange: TimeRange;
}

export const LogsContent = ({ assetId, assetType, dataView, dateRange }: Props) => {
  const { searchSessionId } = useSearchSessionContext();

  const filters = useMemo(() => {
    return [
      buildCombinedAssetFilter({
        field: findInventoryFields(assetType).id,
        values: [assetId],
        dataView,
      }),
    ];
  }, [dataView, assetId, assetType]);

  const { euiTheme } = useEuiTheme();
  const { charts } = useLogsCharts({
    dataViewId: dataView?.id,
    seriesColor: euiTheme.colors.backgroundLightText,
  });

  return (
    <EuiFlexGroup direction="row" gutterSize="s" data-test-subj="infraAssetDetailsLogsGrid">
      {charts.map((chartProps, index) => (
        <EuiFlexItem key={index}>
          <Kpi
            {...chartProps}
            dateRange={dateRange}
            filters={filters}
            searchSessionId={searchSessionId}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
