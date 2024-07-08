/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { useContext, useEffect, useMemo } from 'react';
import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { useMlKibana } from '../../contexts/kibana';
import { MlPageControlsContext } from '../ml_page';

export const HeaderMenuPortal: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const { services } = useMlKibana();

  const { setHeaderActionMenu } = useContext(MlPageControlsContext);

  const portalNode = useMemo(() => createHtmlPortalNode(), []);

  useEffect(() => {
    if (!setHeaderActionMenu) {
      return;
    }

    setHeaderActionMenu((element) => {
      const mount = toMountPoint(
        <KibanaContextProvider services={services}>
          <OutPortal node={portalNode} />
        </KibanaContextProvider>,
        services
      );
      return mount(element);
    });

    return () => {
      portalNode.unmount();
      setHeaderActionMenu(undefined);
    };
  }, [portalNode, setHeaderActionMenu, services]);

  return <InPortal node={portalNode}>{children}</InPortal>;
};
