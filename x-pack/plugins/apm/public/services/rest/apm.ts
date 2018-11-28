/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { camelizeKeys } from 'humps';
import { ServiceAPIResponse } from 'x-pack/plugins/apm/server/lib/services/get_service';
import { ServiceListAPIResponse } from 'x-pack/plugins/apm/server/lib/services/get_services';
import { TraceListAPIResponse } from 'x-pack/plugins/apm/server/lib/traces/get_top_traces';
import { TraceAPIResponse } from 'x-pack/plugins/apm/server/lib/traces/get_trace';
import { TimeSeriesAPIResponse } from 'x-pack/plugins/apm/server/lib/transactions/charts';
import { ITransactionDistributionAPIResponse } from 'x-pack/plugins/apm/server/lib/transactions/distribution';
import { TransactionListAPIResponse } from 'x-pack/plugins/apm/server/lib/transactions/get_top_transactions';
import { TransactionAPIResponse } from 'x-pack/plugins/apm/server/lib/transactions/get_transaction';
import { SpanListAPIResponse } from 'x-pack/plugins/apm/server/lib/transactions/spans/get_spans';
import { Span } from 'x-pack/plugins/apm/typings/Span';
import { Transaction } from 'x-pack/plugins/apm/typings/Transaction';
import { IUrlParams } from '../../store/urlParams';
// @ts-ignore
import { convertKueryToEsQuery } from '../kuery';
import { callApi } from './callApi';
// @ts-ignore
import { getAPMIndexPattern } from './savedObjects';

export async function loadLicense() {
  return callApi({
    pathname: `/api/xpack/v1/info`
  });
}

export async function loadServerStatus() {
  return callApi({
    pathname: `/api/apm/status/server`
  });
}

export async function loadAgentStatus() {
  return callApi<{ dataFound: boolean }>({
    pathname: `/api/apm/status/agent`
  });
}

export async function getEncodedEsQuery(kuery?: string) {
  if (!kuery) {
    return;
  }

  const indexPattern = await getAPMIndexPattern();

  if (!indexPattern) {
    return;
  }

  const esFilterQuery = convertKueryToEsQuery(kuery, indexPattern);
  return encodeURIComponent(JSON.stringify(esFilterQuery));
}

export async function loadServiceList({ start, end, kuery }: IUrlParams) {
  return callApi<ServiceListAPIResponse>({
    pathname: `/api/apm/services`,
    query: {
      start,
      end,
      esFilterQuery: await getEncodedEsQuery(kuery)
    }
  });
}

export async function loadServiceDetails({
  serviceName,
  start,
  end,
  kuery
}: IUrlParams) {
  return callApi<ServiceAPIResponse>({
    pathname: `/api/apm/services/${serviceName}`,
    query: {
      start,
      end,
      esFilterQuery: await getEncodedEsQuery(kuery)
    }
  });
}

export async function loadTraceList({ start, end, kuery }: IUrlParams) {
  const groups = await callApi<TraceListAPIResponse>({
    pathname: '/api/apm/traces',
    query: {
      start,
      end,
      esFilterQuery: await getEncodedEsQuery(kuery)
    }
  });

  return groups.map(group => {
    group.sample = addVersion(group.sample);
    return group;
  });
}

export async function loadTransactionList({
  serviceName,
  start,
  end,
  kuery,
  transactionType
}: IUrlParams) {
  const groups = await callApi<TransactionListAPIResponse>({
    pathname: `/api/apm/services/${serviceName}/transactions`,
    query: {
      start,
      end,
      esFilterQuery: await getEncodedEsQuery(kuery),
      transaction_type: transactionType
    }
  });

  return groups.map(group => {
    group.sample = addVersion(group.sample);
    return group;
  });
}

export async function loadTransactionDistribution({
  serviceName,
  start,
  end,
  transactionName,
  kuery
}: IUrlParams) {
  return callApi<ITransactionDistributionAPIResponse>({
    pathname: `/api/apm/services/${serviceName}/transactions/distribution`,
    query: {
      start,
      end,
      transaction_name: transactionName,
      esFilterQuery: await getEncodedEsQuery(kuery)
    }
  });
}

function addVersion<T extends Span | Transaction | null | undefined>(
  item: T
): T {
  if (item != null) {
    item.version = item.hasOwnProperty('trace') ? 'v2' : 'v1';
  }

  return item;
}

function addSpanId(hit: Span, i: number) {
  if (!hit.span.id) {
    hit.span.id = i;
  }
  return hit;
}

export async function loadSpans({
  serviceName,
  start,
  end,
  transactionId
}: IUrlParams) {
  const hits = await callApi<SpanListAPIResponse>({
    pathname: `/api/apm/services/${serviceName}/transactions/${transactionId}/spans`,
    query: {
      start,
      end
    }
  });

  return hits.map(addVersion).map(addSpanId);
}

export async function loadTrace({ traceId, start, end }: IUrlParams) {
  const hits = await callApi<TraceAPIResponse>(
    {
      pathname: `/api/apm/traces/${traceId}`,
      query: {
        start,
        end
      }
    },
    {
      camelcase: false
    }
  );

  return hits.map(addVersion);
}

export async function loadTransaction({
  serviceName,
  start,
  end,
  transactionId,
  traceId,
  kuery
}: IUrlParams) {
  const result = await callApi<TransactionAPIResponse>(
    {
      pathname: `/api/apm/services/${serviceName}/transactions/${transactionId}`,
      query: {
        traceId,
        start,
        end,
        esFilterQuery: await getEncodedEsQuery(kuery)
      }
    },
    {
      camelcase: false
    }
  );

  return addVersion(result);
}

export async function loadCharts({
  serviceName,
  start,
  end,
  kuery,
  transactionType,
  transactionName
}: IUrlParams) {
  return callApi<TimeSeriesAPIResponse>({
    pathname: `/api/apm/services/${serviceName}/transactions/charts`,
    query: {
      start,
      end,
      esFilterQuery: await getEncodedEsQuery(kuery),
      transaction_type: transactionType,
      transaction_name: transactionName
    }
  });
}

interface ErrorGroupListParams extends IUrlParams {
  size: number;
  sortField: string;
  sortDirection: string;
}

export async function loadErrorGroupList({
  serviceName,
  start,
  end,
  kuery,
  size,
  sortField,
  sortDirection
}: ErrorGroupListParams) {
  return callApi({
    pathname: `/api/apm/services/${serviceName}/errors`,
    query: {
      start,
      end,
      size,
      sortField,
      sortDirection,
      esFilterQuery: await getEncodedEsQuery(kuery)
    }
  });
}

export async function loadErrorGroupDetails({
  serviceName,
  start,
  end,
  kuery,
  errorGroupId
}: IUrlParams) {
  // TODO: add types when error section is converted to ts
  const res = await callApi<any>(
    {
      pathname: `/api/apm/services/${serviceName}/errors/${errorGroupId}`,
      query: {
        start,
        end,
        esFilterQuery: await getEncodedEsQuery(kuery)
      }
    },
    {
      camelcase: false
    }
  );
  const camelizedRes: any = camelizeKeys(res);
  if (res.error.context) {
    camelizedRes.error.context = res.error.context;
  }
  return camelizedRes;
}

export async function loadErrorDistribution({
  serviceName,
  start,
  end,
  kuery,
  errorGroupId
}: IUrlParams) {
  return callApi({
    pathname: `/api/apm/services/${serviceName}/errors/${errorGroupId}/distribution`,
    query: {
      start,
      end,
      esFilterQuery: await getEncodedEsQuery(kuery)
    }
  });
}
