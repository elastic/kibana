/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect, RouteComponentProps } from 'react-router-dom';

import { LinkDescriptor } from '@kbn/observability-shared-plugin/public';
import { replaceMetricTimeInQueryString } from '../metrics/metric_detail/hooks/use_metrics_time';
import { getFromFromLocation, getToFromLocation, getNodeNameFromLocation } from './query_params';
import { InventoryItemType } from '../../../common/inventory_models/types';

type RedirectToNodeDetailProps = RouteComponentProps<{
  nodeId: string;
  nodeType: InventoryItemType;
}>;

export const RedirectToNodeDetail = ({
  match: {
    params: { nodeId, nodeType },
  },
  location,
}: RedirectToNodeDetailProps) => {
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

  return <Redirect to={`/detail/${nodeType}/${nodeId}?${queryParams.toString()}`} />;
};

export const getNodeDetailUrl = ({
  nodeType,
  nodeId,
  to,
  from,
  assetName,
}: {
  nodeType: InventoryItemType;
  nodeId: string;
  to?: number;
  from?: number;
  assetName?: string;
}): LinkDescriptor => {
  return {
    app: 'metrics',
    pathname: `link-to/${nodeType}-detail/${nodeId}`,
    search: {
      ...(assetName ? { assetName } : undefined),
      ...(to && from
        ? {
            to: `${to}`,
            from: `${from}`,
          }
        : undefined),
    },
  };
};
