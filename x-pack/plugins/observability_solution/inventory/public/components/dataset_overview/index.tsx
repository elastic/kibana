/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { ControlledEsqlGrid } from '../esql_grid/controlled_esql_grid';
import { useEsqlQueryResult } from '../../hooks/use_esql_query_result';
import { getInitialColumnsForLogs } from '../../util/get_initial_columns_for_logs';
import { ControlledEsqlChart } from '../esql_chart/controlled_esql_chart';

export function DatasetOverview() {
  const {
    path: { id },
  } = useInventoryParams('/dataset/{id}/*');

  const baseQuery = `FROM "${id}" | WHERE @timestamp <= NOW() AND @timestamp >= NOW() - 30 minutes`;

  const logsQuery = `${baseQuery} | LIMIT 100`;

  const logsQueryResult = useEsqlQueryResult({ query: logsQuery });

  const histogramQuery = `${baseQuery} | STATS count = COUNT(*) BY @timestamp = BUCKET(@timestamp, 1 minute)`;

  const histogramQueryResult = useEsqlQueryResult({ query: histogramQuery });

  const initialColumns = useMemo(() => {
    return getInitialColumnsForLogs({
      result: logsQueryResult,
    });
  }, [logsQueryResult]);

  return (
    <EuiFlexGroup direction="column">
      <ControlledEsqlChart
        result={histogramQueryResult}
        id="datastream_log_rate"
        metricNames={['count']}
        height={200}
        chartType="bar"
      />
      <ControlledEsqlGrid
        query={logsQuery}
        result={logsQueryResult}
        initialColumns={initialColumns}
      />
    </EuiFlexGroup>
  );
}
