/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InventoryItemType } from '@kbn/metrics-data-access-plugin/common/inventory_models/types';
import { useLinkProps } from '@kbn/observability-shared-plugin/public';
import { useLocation } from 'react-router-dom';
import { hostsTitle, inventoryTitle } from '../../../../translations';
import { BreadCrumbOptions } from '../types';

export function useParentBreadCrumbResolver() {
  interface LocationStateProps {
    originPathname: string;
  }

  const hostsLinkProps = useLinkProps({
    app: 'metrics',
    pathname: 'hosts',
  });

  const inventoryLinkProps = useLinkProps({
    app: 'metrics',
    pathname: 'inventory',
  });

  const breadCrumbMap = new Map<string, BreadCrumbOptions>([
    ['/hosts', { text: hostsTitle, link: hostsLinkProps }],
    ['/inventory', { text: inventoryTitle, link: inventoryLinkProps }],
  ]);

  const defaultOption: BreadCrumbOptions = breadCrumbMap.get('/inventory')!;

  const { state } = useLocation();
  const locationState: LocationStateProps = state as LocationStateProps;

  function getOptionsByNodeType(nodeType: InventoryItemType): BreadCrumbOptions {
    if (nodeType === 'host') {
      return breadCrumbMap.get('/hosts')!;
    } else {
      return defaultOption;
    }
  }

  function getBreadCrumbOptions(nodeType: InventoryItemType): BreadCrumbOptions {
    if (locationState === undefined) {
      return getOptionsByNodeType(nodeType);
    }

    const originPathName = locationState.originPathname;

    if (originPathName) {
      return breadCrumbMap.get(originPathName) ?? defaultOption;
    }

    return defaultOption;
  }

  return { getBreadCrumbOptions };
}
