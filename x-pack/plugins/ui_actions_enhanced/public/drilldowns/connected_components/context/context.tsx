/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import {
  PublicDrilldownManagerProps,
  DrilldownManagerDependencies,
  DrilldownManagerContextValue,
} from './types';

const context = React.createContext<DrilldownManagerContextValue | null>(null);

export const useDrilldownManager = () => React.useContext(context)!;

export interface DrilldownManagerProviderProps
  extends PublicDrilldownManagerProps,
    DrilldownManagerDependencies {}

export const DrilldownManagerProvider: React.FC<DrilldownManagerProviderProps> = ({
  children,
  ...rest
}) => {
  const contextValue: DrilldownManagerContextValue = {
    ...rest,
    drilldownName: '...',
  };

  return <context.Provider value={contextValue}>{children}</context.Provider>;
};
