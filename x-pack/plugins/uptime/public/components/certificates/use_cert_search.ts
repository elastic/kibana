/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import { useContext } from 'react';
import { createEsParams, useEsSearch } from '@kbn/observability-plugin/public';

import { CertResult, GetCertsParams, Ping } from '../../../common/runtime_types';

import { selectDynamicSettings } from '../../state/selectors';
import {
  DEFAULT_DIRECTION,
  DEFAULT_FROM,
  DEFAULT_SIZE,
  DEFAULT_SORT,
  DEFAULT_TO,
  getCertsRequestBody,
  processCertsResult,
} from '../../../common/requests/get_certs_request_body';
import { UptimeRefreshContext } from '../../contexts';

export const useCertSearch = ({
  pageIndex,
  size = DEFAULT_SIZE,
  search,
  sortBy = DEFAULT_SORT,
  direction = DEFAULT_DIRECTION,
}: GetCertsParams): CertResult & { loading?: boolean } => {
  const settings = useSelector(selectDynamicSettings);
  const { lastRefresh } = useContext(UptimeRefreshContext);

  const searchBody = getCertsRequestBody({
    pageIndex,
    size,
    search,
    sortBy,
    direction,
    to: DEFAULT_TO,
    from: DEFAULT_FROM,
  });

  const esParams = createEsParams({
    index: settings.settings?.heartbeatIndices,
    body: searchBody,
  });

  const { data: result, loading } = useEsSearch<Ping, typeof esParams>(
    esParams,
    [settings.settings?.heartbeatIndices, size, pageIndex, lastRefresh, search, sortBy, direction],
    {
      name: 'getTLSCertificates',
    }
  );

  return result ? { ...processCertsResult(result), loading } : { certs: [], total: 0, loading };
};
