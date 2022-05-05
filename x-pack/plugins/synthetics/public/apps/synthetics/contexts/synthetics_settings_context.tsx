/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AppMountParameters,
  ChromeBadge,
  ChromeBreadcrumb,
  CoreStart,
  I18nStart,
} from '@kbn/core/public';
import React, { createContext, useContext, useMemo } from 'react';
import { ClientPluginsSetup, ClientPluginsStart } from '../../../plugin';
import { CLIENT_DEFAULTS, CONTEXT_DEFAULTS } from '../../../../common/constants';
import { useGetUrlParams } from '../hooks';

export interface CommonlyUsedDateRange {
  from: string;
  to: string;
  display: string;
}

export interface SyntheticsAppProps {
  basePath: string;
  canSave: boolean;
  core: CoreStart;
  darkMode: boolean;
  i18n: I18nStart;
  isApmAvailable: boolean;
  isInfraAvailable: boolean;
  isLogsAvailable: boolean;
  plugins: ClientPluginsSetup;
  startPlugins: ClientPluginsStart;
  setBadge: (badge?: ChromeBadge) => void;
  renderGlobalHelpControls(): void;
  commonlyUsedRanges: CommonlyUsedDateRange[];
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  appMountParameters: AppMountParameters;
  isDev: boolean;
}

export interface SyntheticsSettingsContextValues {
  basePath: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  isApmAvailable: boolean;
  isInfraAvailable: boolean;
  isLogsAvailable: boolean;
  commonlyUsedRanges?: CommonlyUsedDateRange[];
  isDev?: boolean;
}

const { BASE_PATH } = CONTEXT_DEFAULTS;

const { DATE_RANGE_START, DATE_RANGE_END } = CLIENT_DEFAULTS;

/**
 * These are default values for the context. These defaults are typically
 * overwritten by the Synthetics App upon its invocation.
 */
const defaultContext: SyntheticsSettingsContextValues = {
  basePath: BASE_PATH,
  dateRangeStart: DATE_RANGE_START,
  dateRangeEnd: DATE_RANGE_END,
  isApmAvailable: true,
  isInfraAvailable: true,
  isLogsAvailable: true,
  isDev: false,
};
export const SyntheticsSettingsContext = createContext(defaultContext);

export const SyntheticsSettingsContextProvider: React.FC<SyntheticsAppProps> = ({
  children,
  ...props
}) => {
  const { basePath, isApmAvailable, isInfraAvailable, isLogsAvailable, commonlyUsedRanges, isDev } =
    props;

  const { dateRangeStart, dateRangeEnd } = useGetUrlParams();

  const value = useMemo(() => {
    return {
      isDev,
      basePath,
      isApmAvailable,
      isInfraAvailable,
      isLogsAvailable,
      commonlyUsedRanges,
      dateRangeStart: dateRangeStart ?? DATE_RANGE_START,
      dateRangeEnd: dateRangeEnd ?? DATE_RANGE_END,
    };
  }, [
    isDev,
    basePath,
    isApmAvailable,
    isInfraAvailable,
    isLogsAvailable,
    dateRangeStart,
    dateRangeEnd,
    commonlyUsedRanges,
  ]);

  return <SyntheticsSettingsContext.Provider value={value} children={children} />;
};

export const useSyntheticsSettingsContext = () => useContext(SyntheticsSettingsContext);
