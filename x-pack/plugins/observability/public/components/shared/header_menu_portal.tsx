/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode, useEffect, useMemo } from 'react';
import { createPortalNode, InPortal, OutPortal } from 'react-reverse-portal';
import { AppMountParameters } from '../../../../../../src/core/public';
import { toMountPoint } from '../../../../../../src/plugins/kibana_react/public';

interface HeaderMenuPortalProps {
  children: ReactNode;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
}

export function HeaderMenuPortal({ children, setHeaderActionMenu }: HeaderMenuPortalProps) {
  const portalNode = useMemo(() => createPortalNode(), []);

  useEffect(() => {
    let unmount = () => {};

    setHeaderActionMenu((element) => {
      const mount = toMountPoint(<OutPortal node={portalNode} />);
      unmount = mount(element);
      return unmount;
    });

    return () => {
      portalNode.unmount();
      unmount();
    };
  }, [portalNode, setHeaderActionMenu]);

  return <InPortal node={portalNode}>{children}</InPortal>;
}
