/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch, FC, PropsWithChildren, SetStateAction } from 'react';
import React, { useContext, useState, createContext } from 'react';
import type { DiscoverStateContainer } from '@kbn/discover-plugin/public/application/main/services/discover_state';

interface DiscoverCustomizationContext {
  discoverStateContainer: DiscoverStateContainer | undefined;
  setDiscoverStateContainer: Dispatch<SetStateAction<DiscoverStateContainer | undefined>>;
}

export const DiscoverCustomizationContext = createContext<DiscoverCustomizationContext | undefined>(
  undefined
);

type DiscoverCustomizationServiceProviderProps = PropsWithChildren<{}>;

export const DiscoverCustomizationServiceProvider: FC<DiscoverCustomizationServiceProviderProps> = (
  props
) => {
  const { children } = props;

  const [discoverStateContainer, setDiscoverStateContainer] = useState<
    DiscoverStateContainer | undefined
  >();

  return (
    <DiscoverCustomizationContext.Provider
      value={{ discoverStateContainer, setDiscoverStateContainer }}
    >
      {children}
    </DiscoverCustomizationContext.Provider>
  );
};

export const useDiscoverCustomizationServiceForSecuritySolution = () => {
  const context = useContext(DiscoverCustomizationContext);

  if (!context) {
    throw new Error('Should be used inside context');
  }

  return context;
};
