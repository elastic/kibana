/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useApmPluginContext } from '../../../../hooks/useApmPluginContext';
import { getTimepickerRisonData } from '../rison_helpers';
import { RefreshInterval } from '../../../../../../../../src/plugins/data/common/query';

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
  const [mlADLink, setMlADLink] = useState(
    core.http.basePath.prepend('/app/ml/jobs')
  );
  const location = useLocation();

  useEffect(() => {
    let isCancelled = false;
    const generateLink = async () => {
      const { time, refreshInterval } = getTimepickerRisonData(location.search);
      if (ml?.urlGenerator !== undefined) {
        const href = await ml.urlGenerator.createUrl({
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
              : null),
          },
        });
        if (!isCancelled) {
          setMlADLink(href);
        }
      }
    };
    generateLink();
    return () => {
      isCancelled = true;
    };
  }, [ml?.urlGenerator, location.search, jobId, serviceName, transactionType]);

  return mlADLink;
}
