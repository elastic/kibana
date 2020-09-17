/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useContext } from 'react';
import { HttpSetup, DocLinksStart, NotificationsSetup, CoreStart } from 'src/core/public';

import { ManagementAppMountParams } from 'src/plugins/management/public';
import { getApi, getUseRequest, getSendRequest, getDocumentation, getBreadcrumbs } from './lib';

const ComponentTemplatesContext = createContext<Context | undefined>(undefined);

interface Props {
  httpClient: HttpSetup;
  apiBasePath: string;
  trackMetric: (type: 'loaded' | 'click' | 'count', eventName: string) => void;
  docLinks: DocLinksStart;
  toasts: NotificationsSetup['toasts'];
  setBreadcrumbs: ManagementAppMountParams['setBreadcrumbs'];
  getUrlForApp: CoreStart['application']['getUrlForApp'];
}

interface Context {
  httpClient: HttpSetup;
  apiBasePath: string;
  api: ReturnType<typeof getApi>;
  documentation: ReturnType<typeof getDocumentation>;
  breadcrumbs: ReturnType<typeof getBreadcrumbs>;
  trackMetric: (type: 'loaded' | 'click' | 'count', eventName: string) => void;
  toasts: NotificationsSetup['toasts'];
  getUrlForApp: CoreStart['application']['getUrlForApp'];
}

export const ComponentTemplatesProvider = ({
  children,
  value,
}: {
  value: Props;
  children: React.ReactNode;
}) => {
  const {
    httpClient,
    apiBasePath,
    trackMetric,
    docLinks,
    toasts,
    setBreadcrumbs,
    getUrlForApp,
  } = value;

  const useRequest = getUseRequest(httpClient);
  const sendRequest = getSendRequest(httpClient);

  const api = getApi(useRequest, sendRequest, apiBasePath, trackMetric);
  const documentation = getDocumentation(docLinks);
  const breadcrumbs = getBreadcrumbs(setBreadcrumbs);

  return (
    <ComponentTemplatesContext.Provider
      value={{
        api,
        documentation,
        trackMetric,
        toasts,
        httpClient,
        apiBasePath,
        breadcrumbs,
        getUrlForApp,
      }}
    >
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
