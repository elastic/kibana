/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import useObservable from 'react-use/lib/useObservable';
import { RouterLinkProps, getRouterLinkProps } from '@kbn/router-utils/src/get_router_link_props';
import {
  type AssetDetailsLocatorParams,
  ASSET_DETAILS_LOCATOR_ID,
} from '@kbn/observability-shared-plugin/common';
import type { InventoryItemType } from '../../../common/inventory_models/types';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import type { RouteState } from '../../types';

interface QueryParams {
  from?: number;
  to?: number;
  name?: string;
}

export const useAssetDetailsRedirect = () => {
  const location = useLocation();
  const {
    services: {
      application: { currentAppId$ },
      share,
    },
  } = useKibanaContextForPlugin();

  const appId = useObservable(currentAppId$);
  const locator = share?.url.locators.get<AssetDetailsLocatorParams>(ASSET_DETAILS_LOCATOR_ID);

  const getAssetDetailUrl = useCallback(
    ({
      assetType,
      assetId,
      search,
    }: {
      assetType: InventoryItemType;
      assetId: string;
      search: QueryParams;
    }): RouterLinkProps => {
      const { to, from, ...rest } = search;
      const queryParams = {
        assetDetails:
          Object.keys(rest).length > 0
            ? {
                ...rest,
                dateRange: {
                  from: from ? new Date(from).toISOString() : undefined,
                  to: to ? new Date(to).toISOString() : undefined,
                },
              }
            : {},
        _a: {
          time: {
            ...(from ? { from: new Date(from).toISOString() } : undefined),
            ...(to ? { to: new Date(to).toISOString() } : undefined),
            interval: '>=1m',
          },
        },
      };

      const assetDetailsLocatorParams = {
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

      const assetDetailsLinkProps = getRouterLinkProps({
        href: locator?.getRedirectUrl(assetDetailsLocatorParams),
        onClick: () => {
          locator?.navigate(assetDetailsLocatorParams, { replace: false });
        },
      });

      return assetDetailsLinkProps;
    },
    [appId, location.key, location.pathname, location.search, location.state, locator]
  );

  return { getAssetDetailUrl };
};
