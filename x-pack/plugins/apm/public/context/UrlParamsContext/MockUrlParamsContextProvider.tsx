/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { IUrlParams } from './types';
import { UrlParamsContext, useUiFilters } from '.';

const defaultUrlParams = {
  page: 0,
  serviceName: 'opbeans-python',
  transactionType: 'request',
  start: '2018-01-10T09:51:41.050Z',
  end: '2018-01-10T10:06:41.050Z',
};

interface Props {
  params?: IUrlParams;
  children: React.ReactNode;
  refreshTimeRange?: (time: any) => void;
}

export const MockUrlParamsContextProvider = ({
  params,
  children,
  refreshTimeRange = () => undefined,
}: Props) => {
  const urlParams = { ...defaultUrlParams, ...params };
  return (
    <UrlParamsContext.Provider
      value={{
        urlParams,
        refreshTimeRange,
        uiFilters: useUiFilters(urlParams),
      }}
      children={children}
    />
  );
};
