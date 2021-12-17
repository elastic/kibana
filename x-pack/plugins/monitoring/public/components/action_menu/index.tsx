/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect } from 'react';
import {
  KibanaContextProvider,
  toMountPoint,
  useKibana,
} from '../../../../../../src/plugins/kibana_react/public';
import { HeaderActionMenuContext } from '../../application/contexts/header_action_menu_context';

export const ActionMenu: React.FC<{}> = ({ children }) => {
  const { services } = useKibana();
  const { setHeaderActionMenu } = useContext(HeaderActionMenuContext);
  useEffect(() => {
    if (setHeaderActionMenu) {
      setHeaderActionMenu((element) => {
        const mount = toMountPoint(
          <KibanaContextProvider services={services}>{children}</KibanaContextProvider>,
          { theme$: services.theme?.theme$ }
        );
        return mount(element);
      });
      return () => {
        setHeaderActionMenu(undefined);
      };
    }
  }, [children, setHeaderActionMenu, services]);

  return null;
};
