/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect, useLocation, useRouteMatch } from 'react-router-dom';
import rison from '@kbn/rison';
import { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { replaceStateKeyInQueryString } from '../../../common/url_state_storage_service';
import { replaceMetricTimeInQueryString } from '../metrics/metric_detail/hooks/use_metrics_time';
import { AssetDetailsUrlState } from '../../components/asset_details/types';
import { ASSET_DETAILS_URL_STATE_KEY } from '../../components/asset_details/constants';

export const REDIRECT_NODE_DETAILS_FROM_KEY = 'from';
export const REDIRECT_NODE_DETAILS_TO_KEY = 'to';
export const REDIRECT_ASSET_DETAILS_KEY = 'assetDetails';

const getHostDetailSearch = (queryParams: URLSearchParams) => {
  const from = queryParams.get(REDIRECT_NODE_DETAILS_FROM_KEY);
  const to = queryParams.get(REDIRECT_NODE_DETAILS_TO_KEY);
  const assetDetailsParam = queryParams.get(REDIRECT_ASSET_DETAILS_KEY);

  return replaceStateKeyInQueryString(ASSET_DETAILS_URL_STATE_KEY, {
    ...(assetDetailsParam ? (rison.decode(assetDetailsParam) as AssetDetailsUrlState) : undefined),
    dateRange: {
      from: from ? new Date(parseFloat(from)).toISOString() : undefined,
      to: to ? new Date(parseFloat(to)).toISOString() : undefined,
    },
  } as AssetDetailsUrlState)('');
};

const getNodeDetailSearch = (queryParams: URLSearchParams) => {
  const from = queryParams.get(REDIRECT_NODE_DETAILS_FROM_KEY);
  const to = queryParams.get(REDIRECT_NODE_DETAILS_TO_KEY);

  return replaceMetricTimeInQueryString(
    from ? parseFloat(from) : NaN,
    to ? parseFloat(to) : NaN
  )('');
};

export const RedirectToNodeDetail = () => {
  const {
    params: { nodeType, nodeId },
  } = useRouteMatch<{ nodeType: InventoryItemType; nodeId: string }>();

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  const search =
    nodeType === 'host' ? getHostDetailSearch(queryParams) : getNodeDetailSearch(queryParams);

  return (
    <Redirect
      to={{
        pathname: `/detail/${nodeType}/${nodeId}`,
        search,
        state: location.state,
      }}
    />
  );
};
