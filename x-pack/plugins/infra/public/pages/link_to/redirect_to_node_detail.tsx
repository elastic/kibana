/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect, RouteComponentProps } from 'react-router-dom';

import { LinkDescriptor } from '@kbn/observability-plugin/public';
import { replaceMetricTimeInQueryString } from '../metrics/metric_detail/hooks/use_metrics_time';
import { getFromFromLocation, getToFromLocation } from './query_params';
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

  return <Redirect to={`/detail/${nodeType}/${nodeId}?${searchString}`} />;
};

export const getNodeDetailUrl = ({
  nodeType,
  nodeId,
  to,
  from,
}: {
  nodeType: InventoryItemType;
  nodeId: string;
  to?: number;
  from?: number;
}): LinkDescriptor => {
  return {
    app: 'metrics',
    pathname: `link-to/${nodeType}-detail/${nodeId}`,
    search:
      to && from
        ? {
            to: `${to}`,
            from: `${from}`,
          }
        : undefined,
  };
};
