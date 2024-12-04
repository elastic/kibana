/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { EuiFlexGroup } from '@elastic/eui';
import {
  findInventoryFields,
  type InventoryItemType,
} from '@kbn/metrics-data-access-plugin/common';
import { buildCombinedAssetFilter } from '../../../../../utils/filters/build';
import { useSearchSessionContext } from '../../../../../hooks/use_search_session';
import { LogsKpiCharts } from '../../../components/kpis/logs_kpi_charts';

interface Props {
  dataView?: DataView;
  assetId: string;
  assetType: InventoryItemType;
  dateRange: TimeRange;
}

export const LogsGrid = ({ assetId, assetType, dataView, dateRange }: Props) => {
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

  return (
    <EuiFlexGroup direction="row" gutterSize="s" data-test-subj="infraAssetDetailsLogsGrid">
      <LogsKpiCharts
        dateRange={dateRange}
        dataView={dataView}
        searchSessionId={searchSessionId}
        filters={filters}
      />
    </EuiFlexGroup>
  );
};
