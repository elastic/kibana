/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stripTrailingSlash } from '../../../../common/strip_slashes';

import { KibanaLogic } from '../kibana';
import { generateReactRouterProps, ReactRouterProps } from '../react_router_helpers';

interface Params {
  to: string;
  isRoot?: boolean;
  shouldShowActiveForSubroutes?: boolean;
}

export const generateNavLink = ({ to, ...rest }: Params & ReactRouterProps) => {
  return {
    ...generateReactRouterProps({ to, ...rest }),
    isSelected: getNavLinkActive({ to, ...rest }),
  };
};

export const getNavLinkActive = ({
  to,
  isRoot = false,
  shouldShowActiveForSubroutes = false,
}: Params): boolean => {
  const { pathname } = KibanaLogic.values.history.location;
  const currentPath = stripTrailingSlash(pathname);

  const isActive =
    currentPath === to ||
    (shouldShowActiveForSubroutes && currentPath.startsWith(to)) ||
    (isRoot && currentPath === '');

  return isActive;
};
