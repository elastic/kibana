/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ComponentType } from 'react';
import React, { memo } from 'react';
import { Route } from '@kbn/kibana-react-plugin/public';
import { NoPermissions } from '../no_permissons';

export interface PrivilegedRouteProps {
  path: string;
  component: ComponentType<{}>;
  privilege: boolean;
}

export const PrivilegedRoute = memo(({ component, privilege, path }: PrivilegedRouteProps) => {
  return <Route path={path} component={privilege ? component : NoPermissions} />;
});
PrivilegedRoute.displayName = 'PrivilegedRoute';
