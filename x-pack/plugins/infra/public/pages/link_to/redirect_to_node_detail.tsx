/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect, useLocation, useRouteMatch } from 'react-router-dom';
import { replaceMetricTimeInQueryString } from '../metrics/metric_detail/hooks/use_metrics_time';
import {
  getFromFromLocation,
  getToFromLocation,
  getNodeNameFromLocation,
  getStateFromLocation,
} from './query_params';
import { InventoryItemType } from '../../../common/inventory_models/types';
import { RouteState } from '../../components/asset_details/types';

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

  let state: RouteState | undefined;
  try {
    const stateFromLocation = getStateFromLocation(location);
    state = stateFromLocation ? JSON.parse(stateFromLocation) : undefined;
  } catch (err) {
    state = undefined;
  }

  return (
    <Redirect
      to={{
        pathname: `/detail/${nodeType}/${nodeId}`,
        search: queryParams.toString(),
        state,
      }}
    />
  );
};
