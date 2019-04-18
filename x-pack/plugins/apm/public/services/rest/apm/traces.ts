/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TraceListAPIResponse } from '../../../../server/lib/traces/get_top_traces';
import { TraceAPIResponse } from '../../../../server/lib/traces/get_trace';
import { MissingArgumentsError } from '../../../hooks/useFetcher';
import { IUrlParams } from '../../../store/urlParams';
import { callApi } from '../callApi';
import { getEncodedEsQuery } from './apm';

export async function loadTrace({ traceId, start, end }: IUrlParams) {
  if (!(traceId && start && end)) {
    throw new MissingArgumentsError();
  }

  return callApi<TraceAPIResponse>({
    pathname: `/api/apm/traces/${traceId}`,
    query: {
      start,
      end
    }
  });
}

export async function loadTraceList({ start, end, kuery }: IUrlParams) {
  if (!(start && end)) {
    throw new MissingArgumentsError();
  }

  return callApi<TraceListAPIResponse>({
    pathname: '/api/apm/traces',
    query: {
      start,
      end,
      esFilterQuery: await getEncodedEsQuery(kuery)
    }
  });
}
