/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { SpacesManager } from '../spaces_manager';
import { ShareToSpacesData } from '../types';
import { SpacesReactContext, SpacesReactContextValue, KibanaServices } from './types';

const { useContext, createElement, createContext } = React;

const context = createContext<Partial<SpacesReactContextValue<KibanaServices>>>({});

export const useSpaces = <Extra extends object = {}>(): SpacesReactContextValue<
  KibanaServices & Extra
> =>
  useContext(
    (context as unknown) as React.Context<SpacesReactContextValue<KibanaServices & Extra>>
  );

export const createSpacesReactContext = <Services extends KibanaServices>(
  services: Services,
  spacesManager: SpacesManager,
  shareToSpacesDataPromise: Promise<ShareToSpacesData>
): SpacesReactContext<Services> => {
  const value: SpacesReactContextValue<Services> = {
    spacesManager,
    shareToSpacesDataPromise,
    services,
  };
  const Provider: React.FC = ({ children }) =>
    createElement(context.Provider as React.ComponentType<any>, { value, children });

  return {
    value,
    Provider,
    Consumer: (context.Consumer as unknown) as React.Consumer<SpacesReactContextValue<Services>>,
  };
};
