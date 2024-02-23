/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UrlParams } from './types';
import { UrlParamsContext } from './url_params_context';

const defaultUrlParams = {
  page: 0,
  serviceName: 'opbeans-python',
  transactionType: 'request',
  start: '2018-01-10T09:51:41.050Z',
  end: '2018-01-10T10:06:41.050Z',
};

interface Props {
  params?: UrlParams;
  children: React.ReactNode;
  refreshTimeRange?: (time: any) => void;
}

export function MockUrlParamsContextProvider({
  params,
  children,
  refreshTimeRange = () => undefined,
}: Props) {
  const urlParams = { ...defaultUrlParams, ...params };
  return (
    <UrlParamsContext.Provider
      value={{
        rangeId: 0,
        refreshTimeRange,
        urlParams,
      }}
      children={children}
    />
  );
}
