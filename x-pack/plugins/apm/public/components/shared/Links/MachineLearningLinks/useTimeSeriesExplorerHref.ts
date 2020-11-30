/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useApmPluginContext } from '../../../../hooks/useApmPluginContext';
import { useMlHref } from '../../../../../../ml/public';
import { useUrlParams } from '../../../../hooks/useUrlParams';

export function useTimeSeriesExplorerHref({
  jobId,
  serviceName,
  transactionType,
}: {
  jobId: string;
  serviceName?: string;
  transactionType?: string;
}) {
  // default to link to ML Anomaly Detection jobs management page
  const {
    core,
    plugins: { ml },
  } = useApmPluginContext();
  const { urlParams } = useUrlParams();
  const { rangeFrom, rangeTo, refreshInterval, refreshPaused } = urlParams;

  const timeRange =
    rangeFrom !== undefined && rangeTo !== undefined
      ? { from: rangeFrom, to: rangeTo }
      : undefined;
  const mlAnomalyDetectionHref = useMlHref(ml, core.http.basePath.get(), {
    page: 'timeseriesexplorer',
    pageState: {
      jobIds: [jobId],
      timeRange,
      refreshInterval:
        refreshPaused !== undefined && refreshInterval !== undefined
          ? { pause: refreshPaused, value: refreshInterval }
          : undefined,
      ...(serviceName && transactionType
        ? {
            entities: {
              'service.name': serviceName,
              'transaction.type': transactionType,
            },
          }
        : {}),
    },
  });

  return mlAnomalyDetectionHref;
}
