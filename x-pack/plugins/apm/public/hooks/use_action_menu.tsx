/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import { getActionMenuMountPoint } from '../application/action_menu';
import { APMRouteDefinition } from '../application/routes';
import { useApmPluginContext } from './useApmPluginContext';

export function useActionMenu(routes: APMRouteDefinition[]) {
  const apmPluginContextValue = useApmPluginContext();
  const { setHeaderActionMenu } = apmPluginContextValue.appMountParameters;

  useEffect(() => {
    setHeaderActionMenu((el) =>
      getActionMenuMountPoint(apmPluginContextValue, routes)(el)
    );
  });
}
