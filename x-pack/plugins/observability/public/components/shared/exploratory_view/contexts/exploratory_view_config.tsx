/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import { AppMountParameters } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import type { AppDataType, ConfigProps, ReportViewType, SeriesConfig } from '../types';

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
  theme$: AppMountParameters['theme$'];
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
  theme$,
}: { children: JSX.Element } & ExploratoryViewContextValue) {
  const value = {
    reportTypes,
    dataTypes,
    indexPatterns,
    reportConfigMap,
    setHeaderActionMenu,
    theme$,
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

export const SELECT_REPORT_TYPE = i18n.translate(
  'xpack.observability.expView.seriesBuilder.selectReportType',
  {
    defaultMessage: 'No report type selected',
  }
);
