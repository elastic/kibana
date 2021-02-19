/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { DrilldownManagerState, DrilldownManagerStateDeps } from '../../state';

const context = React.createContext<DrilldownManagerState | null>(null);

export const useDrilldownManager = () => React.useContext(context)!;

export type DrilldownManagerProviderProps = DrilldownManagerStateDeps;

export const DrilldownManagerProvider: React.FC<DrilldownManagerProviderProps> = ({
  children,
  ...deps
}) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = React.useMemo(() => new DrilldownManagerState(deps), []);

  return <context.Provider value={value}>{children}</context.Provider>;
};
