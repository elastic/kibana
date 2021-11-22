/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import { AppMountParameters } from 'kibana/public';
import { AppDataType, ConfigProps, ReportViewType, SeriesConfig } from '../types';
import { SELECT_REPORT_TYPE } from '../series_editor/series_editor';

export type ReportConfigMap = Record<string, Array<(config: ConfigProps) => SeriesConfig>>;

interface ExploratoryViewContextValue {
  dataTypes: Array<{ id: AppDataType; label: string }>;
  reportTypes: Array<{
    reportType: ReportViewType | typeof SELECT_REPORT_TYPE;
    label: string;
  }>;
  indexPatterns: Record<string, string>;
  reportConfigMap: ReportConfigMap;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
}

export const ExploratoryViewContext = createContext<ExploratoryViewContextValue>({
  indexPatterns: {},
} as ExploratoryViewContextValue);

export function ExploratoryViewContextProvider({
  children,
  reportTypes,
  dataTypes,
  indexPatterns,
  reportConfigMap,
  setHeaderActionMenu,
}: { children: JSX.Element } & ExploratoryViewContextValue) {
  const value = {
    reportTypes,
    dataTypes,
    indexPatterns,
    reportConfigMap,
    setHeaderActionMenu,
  };

  return (
    <ExploratoryViewContext.Provider value={value}>{children}</ExploratoryViewContext.Provider>
  );
}

export function useExploratoryView() {
  const context = useContext(ExploratoryViewContext);

  if (context === undefined) {
    throw new Error('useExploratoryView must be used within a ExploratoryViewContextProvider');
  }
  return context;
}
