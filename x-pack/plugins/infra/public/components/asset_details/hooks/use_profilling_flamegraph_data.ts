/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { BaseFlameGraph } from '@kbn/profiling-utils';
import type { Subject } from 'rxjs';
import {
  type InfraProfilingRequestParams,
  InfraProfilingRequestParamsRT,
} from '../../../../common/http_api/profiling_api';
import { useHTTPRequest } from '../../../hooks/use_http_request';

interface Props extends InfraProfilingRequestParams {
  request$?: Subject<() => Promise<BaseFlameGraph>>;
  active: boolean;
}

export function useProfilingFlamegraphData({ request$, active, ...params }: Props) {
  const { loading, error, response, makeRequest } = useHTTPRequest<BaseFlameGraph>(
    '/api/infra/profiling/flamegraph',
    'POST',
    JSON.stringify(InfraProfilingRequestParamsRT.encode(params)),
    undefined,
    undefined,
    undefined,
    true
  );

  useEffect(() => {
    if (!active) {
      return;
    }

    if (request$) {
      request$.next(makeRequest);
    } else {
      makeRequest();
    }
  }, [active, makeRequest, request$]);

  return {
    loading,
    error,
    response,
  };
}
