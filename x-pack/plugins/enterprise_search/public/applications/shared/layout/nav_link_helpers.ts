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
  isRoot?: boolean;
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
  isRoot = false,
  shouldShowActiveForSubroutes = false,
  items = [],
}: Params): boolean => {
  const { pathname } = KibanaLogic.values.history.location;
  const currentPath = stripTrailingSlash(pathname);

  if (currentPath === to) return true;

  if (isRoot && currentPath === '') return true;

  if (shouldShowActiveForSubroutes) {
    if (items.length) return false; // If a nav link has sub-nav items open, never show it as active
    if (currentPath.startsWith(to)) return true;
  }

  return false;
};
