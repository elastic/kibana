/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect, useLocation, useRouteMatch } from 'react-router-dom';

import { LinkDescriptor } from '@kbn/observability-shared-plugin/public';
import { replaceMetricTimeInQueryString } from '../metrics/metric_detail/hooks/use_metrics_time';
import {
  getFromFromLocation,
  getToFromLocation,
  getNodeNameFromLocation,
  getStateFromLocation,
} from './query_params';
import { InventoryItemType } from '../../../common/inventory_models/types';
import type { RouteState } from '../../components/asset_details/types';

interface QueryParams {
  from?: number;
  to?: number;
  assetName?: string;
  state?: RouteState;
}

export const RedirectToNodeDetail = () => {
  const {
    params: { nodeType, nodeId },
  } = useRouteMatch<{ nodeType: InventoryItemType; nodeId: string }>();

  const location = useLocation();

  const searchString = replaceMetricTimeInQueryString(
    getFromFromLocation(location),
    getToFromLocation(location)
  )('');

  const queryParams = new URLSearchParams(searchString);

  if (nodeType === 'host') {
    const assetName = getNodeNameFromLocation(location);
    if (assetName) {
      queryParams.set('assetName', assetName);
    }
  }

  const state = getStateFromLocation(location);
  return (
    <Redirect
      to={{
        pathname: `/detail/${nodeType}/${nodeId}`,
        search: queryParams.toString(),
        state: state ? JSON.parse(state) : undefined,
      }}
    />
  );
};

export const getNodeDetailUrl = ({
  nodeType,
  nodeId,
  search,
}: {
  nodeType: InventoryItemType;
  nodeId: string;
  search: QueryParams;
}): LinkDescriptor => {
  const { to, from, state, ...rest } = search;
  return {
    app: 'metrics',
    pathname: `link-to/${nodeType}-detail/${nodeId}`,
    search: {
      ...rest,
      ...(state ? { state: JSON.stringify(state) } : undefined),
      ...(to && from
        ? {
            to: `${to}`,
            from: `${from}`,
          }
        : undefined),
    },
  };
};
