/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createContext, useContext } from 'react';
import { HttpSetup } from 'src/core/public';
import { SpacesManager, Space } from '../../../../../spaces/public';

export interface SpacesContextValue {
  spacesManager: SpacesManager;
  allSpaces: Space[];
}

export const SpacesContext = createContext<Partial<SpacesContextValue>>({});

export function createSpacesContext(http: HttpSetup) {
  return { spacesManager: new SpacesManager(http), allSpaces: [] } as SpacesContextValue;
}

export function useSpacesContext() {
  const context = useContext(SpacesContext);

  if (context.spacesManager === undefined) {
    throw new Error('required attribute is undefined');
  }

  return context as SpacesContextValue;
}
