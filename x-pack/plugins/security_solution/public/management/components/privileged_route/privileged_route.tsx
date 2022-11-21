/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ComponentType } from 'react';
import React, { memo } from 'react';
import { Route } from '@kbn/kibana-react-plugin/public';
import { NoPrivilegesPage } from '../../../common/components/no_privileges';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { NoPermissions } from '../no_permissons';
import { useKibana } from '../../../common/lib/kibana';
import { MANAGEMENT_ROUTING_RESPONSE_ACTIONS_HISTORY_PATH } from '../../common/constants';

export interface PrivilegedRouteProps {
  path: string;
  component: ComponentType<{}>;
  hasPrivilege: boolean;
}

export const PrivilegedRoute = memo(({ component, hasPrivilege, path }: PrivilegedRouteProps) => {
  const { docLinks } = useKibana().services;
  const isEndpointRbacEnabled = useIsExperimentalFeatureEnabled('endpointRbacEnabled');
  const isEndpointRbacV1Enabled = useIsExperimentalFeatureEnabled('endpointRbacV1Enabled');

  let componentToRender = component;

  if (!hasPrivilege) {
    const shouldUseMissingPrivilegesScreen =
      isEndpointRbacEnabled ||
      (isEndpointRbacV1Enabled && path === MANAGEMENT_ROUTING_RESPONSE_ACTIONS_HISTORY_PATH);

    componentToRender = shouldUseMissingPrivilegesScreen
      ? () => <NoPrivilegesPage documentationUrl={docLinks.links.securitySolution.privileges} />
      : NoPermissions;
  }

  return <Route path={path} component={componentToRender} />;
});
PrivilegedRoute.displayName = 'PrivilegedRoute';
