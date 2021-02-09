/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import { HttpSetup } from 'src/core/public';
import { SpacesManager, Space } from '../../../../../spaces/public';

export interface SpacesContextValue {
  spacesManager: SpacesManager | null;
  allSpaces: Space[];
  spacesEnabled: boolean;
}

export const SpacesContext = createContext<Partial<SpacesContextValue>>({});

export function createSpacesContext(http: HttpSetup, spacesEnabled: boolean) {
  return {
    spacesManager: spacesEnabled ? new SpacesManager(http) : null,
    allSpaces: [],
    spacesEnabled,
  } as SpacesContextValue;
}

export function useSpacesContext() {
  const context = useContext(SpacesContext);

  if (context.spacesManager === undefined) {
    throw new Error('required attribute is undefined');
  }

  return context as SpacesContextValue;
}
