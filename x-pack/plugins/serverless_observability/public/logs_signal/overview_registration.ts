/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISearchGeneric } from '@kbn/data-plugin/public';
import type {
  DataHandler,
  InfraLogsHasDataResponse,
  LogsFetchDataResponse,
} from '@kbn/observability-plugin/public';
import * as rt from 'io-ts';
import { lastValueFrom } from 'rxjs';
import { decodeOrThrow } from '@kbn/io-ts-utils';

type InfraLogsDashboardAppName = 'infra_logs';

// check log data streams that match the naming convention, except for the APM
// error stream, because its presence would always mask the "APM only" case
const LOG_DATA_INDICES = 'logs-*-*,-logs-apm.error-*';

export function createObservabilityDashboardRegistration({
  search,
}: {
  search: Promise<ISearchGeneric>;
}): {
  appName: InfraLogsDashboardAppName;
} & DataHandler<InfraLogsDashboardAppName> {
  return {
    appName: 'infra_logs',
    fetchData: fetchObservabilityDashboardData,
    hasData: hasObservabilityDashboardData({ search }),
  };
}

async function fetchObservabilityDashboardData(): Promise<LogsFetchDataResponse> {
  throw new Error('Overview data fetching has not been implemented for serverless deployments.');
}

const hasObservabilityDashboardData =
  ({ search }: { search: Promise<ISearchGeneric> }) =>
  async (): Promise<InfraLogsHasDataResponse> => {
    const hasData: boolean = await lastValueFrom(
      (
        await search
      )({
        params: {
          ignore_unavailable: true,
          allow_no_indices: true,
          index: LOG_DATA_INDICES,
          size: 0,
          terminate_after: 1,
          track_total_hits: 1,
        },
      })
    ).then(
      ({ rawResponse }) => {
        if (rawResponse._shards.total <= 0) {
          return false;
        }

        const totalHits = decodeTotalHits(rawResponse.hits.total);
        if (typeof totalHits === 'number' ? totalHits > 0 : totalHits.value > 0) {
          return true;
        }

        return false;
      },
      (err) => {
        if (err.status === 404) {
          return false;
        }
        throw new Error(`Failed to check status of log indices "${LOG_DATA_INDICES}": ${err}`);
      }
    );

    return {
      hasData,
      indices: LOG_DATA_INDICES,
    };
  };

const decodeTotalHits = decodeOrThrow(
  rt.union([
    rt.number,
    rt.type({
      value: rt.number,
    }),
  ])
);
