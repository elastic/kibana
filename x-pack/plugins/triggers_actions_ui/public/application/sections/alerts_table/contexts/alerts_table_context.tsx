/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PropsWithChildren, createContext, useContext } from 'react';
import { AdditionalContext, RenderContext } from '../../../../types';

const AlertsTableContext = createContext({});

export const AlertsTableContextProvider = <AC extends AdditionalContext = AdditionalContext>({
  children,
  value,
}: PropsWithChildren<{
  value: RenderContext<AC>;
}>) => {
  return <AlertsTableContext.Provider value={value}>{children}</AlertsTableContext.Provider>;
};

export const useAlertsTableContext = <AC extends AdditionalContext = AdditionalContext>() => {
  return useContext(AlertsTableContext) as RenderContext<AC>;
};
