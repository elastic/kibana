/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { createPortalNode, InPortal, OutPortal } from 'react-reverse-portal';
import { toMountPoint } from '../../../../../../src/plugins/kibana_react/public';
import { HeaderMenuPortalProps } from './types';

// eslint-disable-next-line import/no-default-export
export default function HeaderMenuPortal({ children, setHeaderActionMenu }: HeaderMenuPortalProps) {
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
