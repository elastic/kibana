/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useState } from 'react';
import { AppMountParameters } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { AppDataType, ConfigProps, ReportViewType, SeriesConfig } from '../types';

export type ReportConfigMap = Record<string, Array<(config: ConfigProps) => SeriesConfig>>;

interface ExploratoryViewContextValue {
  dataTypes: Array<{ id: AppDataType; label: string }>;
  reportTypes: Array<{
    reportType: ReportViewType | typeof SELECT_REPORT_TYPE;
    label: string;
  }>;
  dataViews: Record<string, string>;
  reportConfigMap: ReportConfigMap;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  theme$: AppMountParameters['theme$'];
  isEditMode?: boolean;
  setIsEditMode?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ExploratoryViewContext = createContext<ExploratoryViewContextValue>({
  dataViews: {},
} as ExploratoryViewContextValue);

export function ExploratoryViewContextProvider({
  children,
  reportTypes,
  dataTypes,
  dataViews,
  reportConfigMap,
  setHeaderActionMenu,
  theme$,
}: { children: JSX.Element } & ExploratoryViewContextValue) {
  const [isEditMode, setIsEditMode] = useState(false);

  const value = {
    reportTypes,
    dataTypes,
    dataViews,
    reportConfigMap,
    setHeaderActionMenu,
    theme$,
    isEditMode,
    setIsEditMode,
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
