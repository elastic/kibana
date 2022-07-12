/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSideNavItemType } from '@elastic/eui';

import { stripTrailingSlash } from '../../../../common/strip_slashes';

import { KibanaLogic } from '../kibana';
import { generateReactRouterProps, ReactRouterProps } from '../react_router_helpers';

interface Params {
  to: string;
  shouldShowActiveForSubroutes?: boolean;
  items?: Array<EuiSideNavItemType<unknown>>; // Primarily passed if using `items` to determine isSelected - if not, you can just set `items` outside of this helper
}

export const generateNavLink = ({ to, items, ...rest }: Params & ReactRouterProps) => {
  return {
    ...generateReactRouterProps({ to, ...rest }),
    isSelected: getNavLinkActive({ to, items, ...rest }),
    items,
  };
};

export const getNavLinkActive = ({
  to,
  shouldShowActiveForSubroutes = false,
  items = [],
  shouldNotCreateHref = false,
}: Params & ReactRouterProps): boolean => {
  const { pathname } = KibanaLogic.values.history.location;
  // @ts-ignore TODO: Not sure where this is coming from. Is Kibana inserting it?
  const basePath: string = KibanaLogic.values.history.basePath;
  const currentPath = stripTrailingSlash(pathname);

  // If shouldNotCreateHref is true then `to` will include the react router basePath
  // see x-pack/plugins/enterprise_search/public/applications/shared/react_router_helpers/create_href.ts
  const path = shouldNotCreateHref ? basePath + currentPath : currentPath;

  if (path === to) return true;

  if (shouldShowActiveForSubroutes) {
    if (items.length) return false; // If a nav link has sub-nav items open, never show it as active
    if (path.startsWith(to)) return true;
  }

  return false;
};
