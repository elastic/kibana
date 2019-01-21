/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TraceListAPIResponse } from 'x-pack/plugins/apm/server/lib/traces/get_top_traces';
import { TraceAPIResponse } from 'x-pack/plugins/apm/server/lib/traces/get_trace';
import { IUrlParams } from '../../../store/urlParams';
import { callApi } from '../callApi';
import { addVersion, getEncodedEsQuery } from './apm';

export async function loadTrace({ traceId, start, end }: IUrlParams) {
  const hits = await callApi<TraceAPIResponse>({
    pathname: `/api/apm/traces/${traceId}`,
    query: {
      start,
      end
    }
  });

  return hits.map(addVersion);
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
