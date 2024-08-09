/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useContext, createContext } from 'react';
import type { InvestigateWidgetCreate } from '../../common';

export interface UseInvestigateWidgetApi<
  TParameters extends Record<string, any> = {},
  TData extends Record<string, any> = {}
> {
  onWidgetAdd: (create: InvestigateWidgetCreate) => Promise<void>;
}

const InvestigateWidgetApiContext = createContext<UseInvestigateWidgetApi | undefined>(undefined);

export const InvestigateWidgetApiContextProvider = InvestigateWidgetApiContext.Provider;

export function useInvestigateWidget(): UseInvestigateWidgetApi | undefined {
  const context = useContext(InvestigateWidgetApiContext);

  return context;
}
