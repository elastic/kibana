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
import type { InventoryItemType } from '../../../common/inventory_models/types';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';

interface QueryParams {
  from?: number;
  to?: number;
  assetName?: string;
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
    ({
      nodeType,
      nodeId,
      search,
    }: {
      nodeType: InventoryItemType;
      nodeId: string;
      search: QueryParams;
    }): LinkDescriptor => {
      const { to, from, ...rest } = search;

      return {
        app: 'metrics',
        pathname: `link-to/${nodeType}-detail/${nodeId}`,
        search: {
          ...rest,
          ...(to && from
            ? {
                to: `${to}`,
                from: `${from}`,
              }
            : undefined),
          // While we don't have a shared state between all page in infra, this makes it possible to restore a page state when returning to the previous route
          ...(location.search || location.pathname
            ? {
                state: JSON.stringify({
                  originAppId: appId,
                  originSearch: location.search,
                  originPathname: location.pathname,
                }),
              }
            : undefined),
        },
      };
    },
    [location.pathname, appId, location.search]
  );

  return { getNodeDetailUrl };
};
