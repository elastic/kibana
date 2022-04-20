/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { UptimeAppProps } from '../apps/uptime_app';
import { CLIENT_DEFAULTS, CONTEXT_DEFAULTS } from '../../common/constants';
import { CommonlyUsedRange } from '../components/common/uptime_date_picker';
import { useGetUrlParams } from '../hooks';

export interface UptimeSettingsContextValues {
  basePath: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  isApmAvailable: boolean;
  isInfraAvailable: boolean;
  isLogsAvailable: boolean;
  commonlyUsedRanges?: CommonlyUsedRange[];
  isDev?: boolean;
}

const { BASE_PATH } = CONTEXT_DEFAULTS;

const { DATE_RANGE_START, DATE_RANGE_END } = CLIENT_DEFAULTS;

/**
 * These are default values for the context. These defaults are typically
 * overwritten by the Uptime App upon its invocation.
 */
const defaultContext: UptimeSettingsContextValues = {
  basePath: BASE_PATH,
  dateRangeStart: DATE_RANGE_START,
  dateRangeEnd: DATE_RANGE_END,
  isApmAvailable: true,
  isInfraAvailable: true,
  isLogsAvailable: true,
  isDev: false,
};
export const UptimeSettingsContext = createContext(defaultContext);

export const UptimeSettingsContextProvider: React.FC<UptimeAppProps> = ({ children, ...props }) => {
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

  return <UptimeSettingsContext.Provider value={value} children={children} />;
};

export const useUptimeSettingsContext = () => useContext(UptimeSettingsContext);
