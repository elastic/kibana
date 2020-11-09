/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { unmountComponentAtNode } from 'react-dom';
import { createPortalNode, InPortal, OutPortal } from 'react-reverse-portal';
import { toMountPoint } from '../../../../../src/plugins/kibana_react/public';
import { ActionMenu } from '../application/action_menu';
import { useApmPluginContext } from './useApmPluginContext';

export function useActionMenu() {
  const { setHeaderActionMenu } = useApmPluginContext().appMountParameters;
  const portalNode = createPortalNode();

  useEffect(() => {
    let mountPointElement: HTMLElement;

    setHeaderActionMenu((element) => {
      mountPointElement = element;
      return toMountPoint(<OutPortal node={portalNode} />)(mountPointElement);
    });

    return () => {
      if (mountPointElement) {
        unmountComponentAtNode(mountPointElement);
      }
    };
  });

  return () => (
    <InPortal node={portalNode}>
      <ActionMenu />
    </InPortal>
  );
}
