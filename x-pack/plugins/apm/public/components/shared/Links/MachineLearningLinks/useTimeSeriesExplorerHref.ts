/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useLocation } from 'react-router-dom';
import { useApmPluginContext } from '../../../../hooks/useApmPluginContext';
import { getTimepickerRisonData } from '../rison_helpers';
import { RefreshInterval } from '../../../../../../../../src/plugins/data/common/query';
import { useMlHref } from '../../../../../../ml/public';

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
  const location = useLocation();
  const { time, refreshInterval } = getTimepickerRisonData(location.search);

  const mlAnomalyDetectionHref = useMlHref(ml, core.http.basePath.get(), {
    page: 'timeseriesexplorer',
    pageState: {
      jobIds: [jobId],
      timeRange: time,
      refreshInterval: refreshInterval as RefreshInterval,
      zoom: time,
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
