/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useContext } from 'react';
import { HttpSetup } from 'src/core/public';

import { getApi, getUseRequest } from './lib';

const ComponentTemplatesContext = createContext<Context | undefined>(undefined);

interface Props {
  httpClient: HttpSetup;
  apiBasePath: string;
}

interface Context {
  api: ReturnType<typeof getApi>;
}

export const ComponentTemplatesProvider = ({
  children,
  value,
}: {
  value: Props;
  children: React.ReactNode;
}) => {
  const useRequest = getUseRequest(value.httpClient);
  const api = getApi(useRequest, value.apiBasePath);

  return (
    <ComponentTemplatesContext.Provider value={{ api }}>
      {children}
    </ComponentTemplatesContext.Provider>
  );
};

export const useComponentTemplatesContext = () => {
  const ctx = useContext(ComponentTemplatesContext);
  if (!ctx) {
    throw new Error(
      '"useComponentTemplatesContext" can only be called inside of ComponentTemplatesProvider!'
    );
  }
  return ctx;
};

export const useApi = () => useComponentTemplatesContext().api;
