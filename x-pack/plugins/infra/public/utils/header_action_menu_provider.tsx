/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppMountParameters } from 'kibana/public';

interface ContextProps {
  setHeaderActionMenu?: AppMountParameters['setHeaderActionMenu'];
}

export const HeaderActionMenuContext = React.createContext<ContextProps>({});

export const HeaderActionMenuProvider: React.FC<Required<ContextProps>> = ({
  setHeaderActionMenu,
  children,
}) => {
  return (
    <HeaderActionMenuContext.Provider value={{ setHeaderActionMenu }}>
      {children}
    </HeaderActionMenuContext.Provider>
  );
};
