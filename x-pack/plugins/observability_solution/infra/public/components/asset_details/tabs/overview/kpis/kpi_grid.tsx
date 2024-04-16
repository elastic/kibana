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
import { findInventoryFields } from '@kbn/metrics-data-access-plugin/common';
import { buildCombinedHostsFilter } from '../../../../../utils/filters/build';
import { HostKpiCharts } from '../../../components/kpis/host_kpi_charts';
import { useLoadingStateContext } from '../../../hooks/use_loading_state';

interface Props {
  dataView?: DataView;
  assetId: string;
  dateRange: TimeRange;
}

export const KPIGrid = ({ assetId, dataView, dateRange }: Props) => {
  const { searchSessionId } = useLoadingStateContext();

  const filters = useMemo(() => {
    return [
      buildCombinedHostsFilter({
        field: findInventoryFields('host').id,
        values: [assetId],
        dataView,
      }),
    ];
  }, [dataView, assetId]);

  return (
    <EuiFlexGroup direction="row" gutterSize="s" data-test-subj="infraAssetDetailsKPIGrid">
      <HostKpiCharts
        dataView={dataView}
        filters={filters}
        dateRange={dateRange}
        searchSessionId={searchSessionId}
      />
    </EuiFlexGroup>
  );
};
