/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmDataSource } from '../../../../common/data_source';
import { ApmServiceDestinationDocumentType } from '../../../../common/document_type';
import { Environment } from '../../../../common/environment_rt';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';

export function useServiceSummaryServiceDestinationFetcher({
  serviceName,
  rangeFrom,
  rangeTo,
  environment,
  preferredExitSpanSource,
}: {
  serviceName: string;
  rangeFrom: string;
  rangeTo: string;
  environment: Environment;
  preferredExitSpanSource: {
    bucketSizeInSeconds: number;
    source: ApmDataSource<ApmServiceDestinationDocumentType>;
  } | null;
}) {
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  return useFetcher(
    (callApmApi) => {
      if (
        !serviceName ||
        !preferredExitSpanSource?.bucketSizeInSeconds ||
        !preferredExitSpanSource?.source.documentType ||
        !preferredExitSpanSource?.source.rollupInterval
      ) {
        return undefined;
      }

      return callApmApi(
        'GET /internal/apm/services/{serviceName}/summary/service_destination',
        {
          params: {
            path: {
              serviceName,
            },
            query: {
              start,
              end,
              environment,
              bucketSizeInSeconds: preferredExitSpanSource.bucketSizeInSeconds,
              documentType: preferredExitSpanSource.source.documentType,
              rollupInterval: preferredExitSpanSource.source.rollupInterval,
            },
          },
        }
      );
    },
    [
      serviceName,
      start,
      end,
      environment,
      preferredExitSpanSource?.source.documentType,
      preferredExitSpanSource?.source.rollupInterval,
      preferredExitSpanSource?.bucketSizeInSeconds,
    ]
  );
}
