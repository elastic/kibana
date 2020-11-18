/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useFetcher } from './useFetcher';
import { UIProcessorEvent } from '../../common/processor_event';

export function useDynamicIndexPattern(
  processorEvent: UIProcessorEvent | undefined
) {
  const { data, status } = useFetcher((callApmApi) => {
    return callApmApi({
      endpoint: 'GET /api/apm/index_pattern/dynamic',
      isCachable: true,
    });
  }, []);

  return {
    indexPattern: data?.dynamicIndexPattern,
    status,
  };
}
