/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters } from 'kibana/public';
import type { FC } from 'react';
import React, { useEffect, useMemo } from 'react';
import { createPortalNode, InPortal, OutPortal } from 'react-reverse-portal';

import { toMountPoint } from '../../../../../../../../src/plugins/kibana_react/public';

export interface Props {
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
}

export const HeaderPortal: FC<Props> = ({ children, setHeaderActionMenu }) => {
  const portalNode = useMemo(() => createPortalNode(), []);

  useEffect(() => {
    setHeaderActionMenu((element) => {
      const mount = toMountPoint(<OutPortal node={portalNode} />);
      return mount(element);
    });

    return () => {
      portalNode.unmount();
      setHeaderActionMenu(undefined);
    };
  }, [portalNode, setHeaderActionMenu]);

  return <InPortal node={portalNode}>{children}</InPortal>;
};
