/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEsSearch, createEsParams } from '../../../../observability/public';

import { CertResult, GetCertsParams, Ping } from '../../../common/runtime_types';
import { useSelector } from 'react-redux';
import { selectDynamicSettings } from '../../state/selectors';
import {
  getCertsRequestBody,
  processCertsResult,
} from '../../../common/requests/get_certs_request_body';
import { useContext } from 'react';
import { UptimeRefreshContext } from '../../contexts';

export const DEFAULT_FROM = 'now-5m';
export const DEFAULT_TO = 'now';
const DEFAULT_SIZE = 25;
const DEFAULT_SORT = 'not_after';
const DEFAULT_DIRECTION = 'asc';

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

  const { data: result, loading } = useEsSearch<Ping, typeof esParams>(esParams, [
    settings.settings?.heartbeatIndices,
    size,
    pageIndex,
    lastRefresh,
    search,
  ]);

  return result ? { ...processCertsResult(result), loading } : { certs: [], total: 0, loading };
};
