/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import useObservable from 'react-use/lib/useObservable';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { getRouterLinkProps } from '@kbn/router-utils';
import {
  type AssetDetailsLocatorParams,
  ASSET_DETAILS_LOCATOR_ID,
} from '@kbn/observability-shared-plugin/common';
import { RouterLinkProps } from '@kbn/router-utils/src/get_router_link_props';
import type { AssetDetailsUrlState, RouteState } from '../../components/asset_details/types';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import {
  REDIRECT_NODE_DETAILS_FROM_KEY,
  REDIRECT_NODE_DETAILS_TO_KEY,
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
      share,
    },
  } = useKibanaContextForPlugin();
  const appId = useObservable(currentAppId$);
  const locator = share.url.locators.get<AssetDetailsLocatorParams>(ASSET_DETAILS_LOCATOR_ID);

  const getNodeDetailUrl = useCallback(
    <T extends InventoryItemType>({
      assetType,
      assetId,
      search,
    }: NodeDetailsRedirectParams<T>): RouterLinkProps => {
      const { from, to, ...additionalParams } = search;
      const queryParams = {
        assetDetails:
          Object.keys(additionalParams).length > 0
            ? {
                ...additionalParams,
                dateRange: {
                  from: from ? new Date(from).toISOString() : undefined,
                  to: to ? new Date(to).toISOString() : undefined,
                },
              }
            : {},
        _a: {
          time: {
            ...(from
              ? { [REDIRECT_NODE_DETAILS_FROM_KEY]: new Date(from).toISOString() }
              : undefined),
            interval: '>=1m', // need to pass the interval to consider the time valid
            ...(to ? { [REDIRECT_NODE_DETAILS_TO_KEY]: new Date(to).toISOString() } : undefined),
          },
        },
      };

      const nodeDetailsLocatorParams = {
        ...queryParams,
        assetType,
        assetId,
        state: {
          ...(location.state ?? {}),
          ...(location.key
            ? ({
                originAppId: appId,
                originSearch: location.search,
                originPathname: location.pathname,
              } as RouteState)
            : {}),
        },
      };
      const nodeDetailsLinkProps = getRouterLinkProps({
        href: locator?.getRedirectUrl(nodeDetailsLocatorParams),
        onClick: () => {
          locator?.navigate(nodeDetailsLocatorParams, { replace: false });
        },
      });

      return nodeDetailsLinkProps;
    },
    [appId, location.key, location.pathname, location.search, location.state, locator]
  );
  return { getNodeDetailUrl };
};
