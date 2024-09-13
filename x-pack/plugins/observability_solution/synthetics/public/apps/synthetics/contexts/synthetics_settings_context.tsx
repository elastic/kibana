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
import React, { createContext, useContext, useMemo, PropsWithChildren } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
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
  coreStart: CoreStart;
  darkMode: boolean;
  i18n: I18nStart;
  isApmAvailable: boolean;
  isInfraAvailable: boolean;
  isLogsAvailable: boolean;
  setupPlugins: ClientPluginsSetup;
  startPlugins: ClientPluginsStart;
  setBadge: (badge?: ChromeBadge) => void;
  renderGlobalHelpControls(): void;
  commonlyUsedRanges: CommonlyUsedDateRange[];
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  appMountParameters: AppMountParameters;
  isDev: boolean;
  isServerless: boolean;
}

export interface SyntheticsSettingsContextValues {
  canSave: boolean;
  basePath: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  isApmAvailable: boolean;
  isInfraAvailable: boolean;
  isLogsAvailable: boolean;
  commonlyUsedRanges?: CommonlyUsedDateRange[];
  isDev?: boolean;
  isServerless?: boolean;
  setBreadcrumbs?: (crumbs: ChromeBreadcrumb[]) => void;
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
  canSave: false,
};
export const SyntheticsSettingsContext = createContext(defaultContext);

export const SyntheticsSettingsContextProvider: React.FC<PropsWithChildren<SyntheticsAppProps>> = ({
  children,
  ...props
}) => {
  const {
    basePath,
    isApmAvailable,
    isInfraAvailable,
    isLogsAvailable,
    commonlyUsedRanges,
    isDev,
    setBreadcrumbs,
    isServerless,
  } = props;

  const { dateRangeStart, dateRangeEnd } = useGetUrlParams();

  const { application } = useKibana().services;

  const canSave = (application?.capabilities.uptime.save ?? false) as boolean;

  const value = useMemo(() => {
    return {
      canSave,
      isDev,
      basePath,
      isApmAvailable,
      isInfraAvailable,
      isLogsAvailable,
      commonlyUsedRanges,
      dateRangeStart: dateRangeStart ?? DATE_RANGE_START,
      dateRangeEnd: dateRangeEnd ?? DATE_RANGE_END,
      setBreadcrumbs,
      isServerless,
    };
  }, [
    canSave,
    isDev,
    basePath,
    isApmAvailable,
    isInfraAvailable,
    isLogsAvailable,
    dateRangeStart,
    dateRangeEnd,
    commonlyUsedRanges,
    setBreadcrumbs,
    isServerless,
  ]);

  return <SyntheticsSettingsContext.Provider value={value} children={children} />;
};

export const useSyntheticsSettingsContext = () => useContext(SyntheticsSettingsContext);
