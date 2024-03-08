/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import type { LinkDescriptor } from '@kbn/observability-shared-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import rison from '@kbn/rison';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import type { AssetDetailsUrlState, RouteState } from '../../components/asset_details/types';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import {
  REDIRECT_NODE_DETAILS_FROM_KEY,
  REDIRECT_NODE_DETAILS_TO_KEY,
  REDIRECT_ASSET_DETAILS_KEY,
} from './redirect_to_node_detail';

export interface MetricDetailsQueryParams {
  from?: number;
  to?: number;
}

export type AssetDetailsQueryParams = MetricDetailsQueryParams &
  Omit<AssetDetailsUrlState, 'dateRange' | 'autoRefresh'>;

type SearchParams<T extends InventoryItemType> = T extends 'host'
  ? AssetDetailsQueryParams
  : MetricDetailsQueryParams;

export interface NodeDetailsRedirectParams<T extends InventoryItemType> {
  assetType: T;
  assetId: string;
  search: SearchParams<T>;
}

export const useNodeDetailsRedirect = () => {
  const location = useLocation();
  const {
    services: {
      application: { currentAppId$ },
    },
  } = useKibanaContextForPlugin();

  const appId = useObservable(currentAppId$);
  const getNodeDetailUrl = useCallback(
    <T extends InventoryItemType>({
      assetType,
      assetId,
      search,
    }: NodeDetailsRedirectParams<T>): LinkDescriptor => {
      const { from, to, ...additionalParams } = search;

      return {
        app: 'metrics',
        pathname: `link-to/${assetType}-detail/${assetId}`,
        search: {
          ...(Object.keys(additionalParams).length > 0
            ? { [REDIRECT_ASSET_DETAILS_KEY]: rison.encodeUnknown(additionalParams) }
            : undefined),
          // retrocompatibility
          ...(from ? { [REDIRECT_NODE_DETAILS_FROM_KEY]: `${from}` } : undefined),
          ...(to ? { [REDIRECT_NODE_DETAILS_TO_KEY]: `${to}` } : undefined),
        },
        state: {
          ...(location.key
            ? ({
                originAppId: appId,
                originSearch: location.search,
                originPathname: location.pathname,
              } as RouteState)
            : undefined),
        },
      };
    },
    [location.key, location.search, location.pathname, appId]
  );

  return { getNodeDetailUrl };
};
