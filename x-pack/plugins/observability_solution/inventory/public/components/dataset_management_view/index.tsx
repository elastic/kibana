/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import useAsync from 'react-use/lib/useAsync';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useKibana } from '../../hooks/use_kibana';
import { EuiLoadingSpinner } from '@elastic/eui';

export function DatasetManagementView() {
  const {
    path: { id },
  } = useInventoryParams('/datastream/{id}/*');

  const {
    core: { http },
  } = useKibana();

  const path = `/internal/dataset_quality/data_streams/${id}/details`;

  const details = useAsync(() => {
    return http.get(path, {
      query: {
        // start is now - 1 hour as iso string
        start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        // end is now as iso string
        end: new Date().toISOString(),
      },
    });
  }, [path, http]);

  // const baseQuery = `FROM "${id}" | WHERE @timestamp <= NOW() AND @timestamp >= NOW() - 60 minutes`;

  // const logsQuery = `${baseQuery} | LIMIT 100`;

  // const logsQueryResult = useEsqlQueryResult({ query: logsQuery });

  // const histogramQuery = `${baseQuery} | STATS count = COUNT(*) BY @timestamp = BUCKET(@timestamp, 1 minute)`;

  // const histogramQueryResult = useEsqlQueryResult({ query: histogramQuery });
  return details.loading ? <EuiLoadingSpinner /> : <pre>{JSON.stringify(details.value)}</pre>;
}
