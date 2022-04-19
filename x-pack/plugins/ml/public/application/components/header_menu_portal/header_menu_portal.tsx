/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, ReactNode, useContext, useEffect, useMemo } from 'react';
import { createPortalNode, InPortal, OutPortal } from 'react-reverse-portal';
import { KibanaContextProvider, toMountPoint } from '@kbn/kibana-react-plugin/public';
import { useMlKibana } from '../../contexts/kibana';
import { MlPageControlsContext } from '../ml_page';

export interface HeaderMenuPortalProps {
  children: ReactNode;
}

export const HeaderMenuPortal: FC<HeaderMenuPortalProps> = ({ children }) => {
  const { services } = useMlKibana();

  const { setHeaderActionMenu } = useContext(MlPageControlsContext);

  const portalNode = useMemo(() => createPortalNode(), []);

  useEffect(() => {
    if (!setHeaderActionMenu) {
      return;
    }

    setHeaderActionMenu((element) => {
      const mount = toMountPoint(
        <KibanaContextProvider services={services}>
          <OutPortal node={portalNode} />
        </KibanaContextProvider>,
        { theme$: services.theme.theme$ }
      );
      return mount(element);
    });

    return () => {
      portalNode.unmount();
      setHeaderActionMenu(undefined);
    };
  }, [portalNode, setHeaderActionMenu, services.theme.theme$]);

  return <InPortal node={portalNode}>{children}</InPortal>;
};
