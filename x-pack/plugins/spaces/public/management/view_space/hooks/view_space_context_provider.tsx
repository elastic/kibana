/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { createContext, useContext } from 'react';

import type { SpacesManager } from '../../../spaces_manager';

interface ViewSpaceServices {
  spacesManager: SpacesManager;
}

const ViewSpaceContext = createContext<ViewSpaceServices | null>(null);

export const ViewSpaceContextProvider: FC<PropsWithChildren<ViewSpaceServices>> = ({
  children,
  ...services
}) => {
  return <ViewSpaceContext.Provider value={{ ...services }}>{children}</ViewSpaceContext.Provider>;
};

export const useViewSpaceServices = (): ViewSpaceServices => {
  const context = useContext(ViewSpaceContext);
  if (!context) {
    throw new Error(
      'ViewSpace Context is mising. Ensure the component or React root is wrapped with ViewSpaceContext'
    );
  }

  return context;
};
