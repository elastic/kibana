/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmMlModule } from '../../../../common/anomaly_detection/apm_ml_module';
import { Environment } from '../../../../common/environment_rt';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';

export function useServiceSummaryAnomalyFetcher({
  serviceName,
  by,
  rangeFrom,
  rangeTo,
  module,
  environment,
  bucketSizeInSeconds,
}: {
  serviceName: string;
  by: string | null;
  rangeFrom: string;
  rangeTo: string;
  module: ApmMlModule;
  environment: Environment;
  bucketSizeInSeconds?: number;
}) {
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  return useFetcher(
    (callApmApi) => {
      if (!serviceName || bucketSizeInSeconds === undefined) {
        return undefined;
      }

      return callApmApi(
        'GET /internal/apm/services/{serviceName}/summary/anomalies',
        {
          params: {
            path: {
              serviceName,
            },
            query: {
              start,
              end,
              by,
              module,
              environment,
              bucketSizeInSeconds,
            },
          },
        }
      );
    },
    [serviceName, start, end, environment, by, module, bucketSizeInSeconds]
  );
}
