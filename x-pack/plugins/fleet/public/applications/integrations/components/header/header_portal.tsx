/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters } from '@kbn/core/public';
import type { FC } from 'react';
import React, { useEffect, useMemo } from 'react';
import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal';

import { toMountPoint } from '@kbn/react-kibana-mount';

import type { FleetStartServices } from '../../../../plugin';

export interface Props {
  children: React.ReactNode;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  startServices: Pick<FleetStartServices, 'analytics' | 'i18n' | 'theme'>;
}

export const HeaderPortal: FC<Props> = ({ children, setHeaderActionMenu, startServices }) => {
  const portalNode = useMemo(() => createHtmlPortalNode(), []);

  useEffect(() => {
    setHeaderActionMenu((element) => {
      const mount = toMountPoint(<OutPortal node={portalNode} />, startServices);
      return mount(element);
    });

    return () => {
      portalNode.unmount();
      setHeaderActionMenu(undefined);
    };
  }, [portalNode, setHeaderActionMenu, startServices]);

  return <InPortal node={portalNode}>{children}</InPortal>;
};
