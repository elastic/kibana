/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import { unmountComponentAtNode } from 'react-dom';
import { getActionMenuMountPoint } from '../application/action_menu';
import { useApmPluginContext } from './useApmPluginContext';

export function useActionMenu(serviceName?: string) {
  const apmPluginContextValue = useApmPluginContext();
  const { setHeaderActionMenu } = apmPluginContextValue.appMountParameters;

  useEffect(() => {
    let mountPointElement: HTMLElement;

    setHeaderActionMenu((element) => {
      mountPointElement = element;
      return getActionMenuMountPoint(
        apmPluginContextValue,
        serviceName
      )(element);
    });

    return () => {
      if (mountPointElement) {
        unmountComponentAtNode(mountPointElement);
      }
    };
  });
}
