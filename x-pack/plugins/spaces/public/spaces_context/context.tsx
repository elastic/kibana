/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';

import type { CoreStart } from '@kbn/core/public';

import type { SpacesManager } from '../spaces_manager';
import type { SpacesData } from '../types';
import type { SpacesReactContext, SpacesReactContextValue } from './types';

const { useContext, createElement, createContext } = React;

const context = createContext<Partial<SpacesReactContextValue<Partial<CoreStart>>>>({});

export const useSpaces = <
  Services extends Partial<CoreStart>
>(): SpacesReactContextValue<Services> =>
  useContext(context as unknown as React.Context<SpacesReactContextValue<Services>>);

export const createSpacesReactContext = <Services extends Partial<CoreStart>>(
  services: Services,
  spacesManager: SpacesManager,
  spacesDataPromise: Promise<SpacesData>
): SpacesReactContext<Services> => {
  const value: SpacesReactContextValue<Services> = {
    spacesManager,
    spacesDataPromise,
    services,
  };
  const Provider: React.FC = ({ children }) =>
    createElement(context.Provider as React.ComponentType<any>, { value, children });

  return {
    value,
    Provider,
    Consumer: context.Consumer as unknown as React.Consumer<SpacesReactContextValue<Services>>,
  };
};
