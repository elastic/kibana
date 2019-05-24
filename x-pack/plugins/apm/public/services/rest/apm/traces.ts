/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TraceListAPIResponse } from '../../../../server/lib/traces/get_top_traces';
import { TraceAPIResponse } from '../../../../server/lib/traces/get_trace';
import { callApi } from '../callApi';
import { getUiFiltersES } from '../../ui_filters/get_ui_filters_es';
import { UIFilters } from '../../../../typings/ui-filters';

export async function loadTrace({
  traceId,
  start,
  end
}: {
  traceId: string;
  start: string;
  end: string;
}) {
  return callApi<TraceAPIResponse>({
    pathname: `/api/apm/traces/${traceId}`,
    query: {
      start,
      end
    }
  });
}

export async function loadTraceList({
  start,
  end,
  uiFilters
}: {
  start: string;
  end: string;
  uiFilters: UIFilters;
}) {
  return callApi<TraceListAPIResponse>({
    pathname: '/api/apm/traces',
    query: {
      start,
      end,
      uiFiltersES: await getUiFiltersES(uiFilters)
    }
  });
}
