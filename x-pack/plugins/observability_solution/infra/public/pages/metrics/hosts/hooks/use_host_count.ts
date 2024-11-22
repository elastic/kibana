/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import { useMemo } from 'react';
import { GetInfraAssetCountResponsePayloadRT } from '../../../../../common/http_api';
import { isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { useUnifiedSearchContext } from './use_unified_search';

export const useHostCount = () => {
  const { buildQuery, parsedDateRange } = useUnifiedSearchContext();

  const payload = useMemo(
    () =>
      JSON.stringify({
        query: buildQuery(),
        from: parsedDateRange.from,
        to: parsedDateRange.to,
      }),
    [buildQuery, parsedDateRange]
  );

  const { data, status, error } = useFetcher(
    async (callApi) => {
      const response = await callApi('/api/infra/host/count', {
        method: 'POST',
        body: payload,
      });

      return decodeOrThrow(GetInfraAssetCountResponsePayloadRT)(response);
    },
    [payload]
  );

  return {
    errors: error,
    loading: isPending(status),
    count: data?.count ?? 0,
  };
};

export const HostCount = createContainer(useHostCount);
export const [HostCountProvider, useHostCountContext] = HostCount;
