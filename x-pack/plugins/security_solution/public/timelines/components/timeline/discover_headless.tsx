/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { KibanaContextProvider, useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { encode } from '@kbn/rison';
import { APP_UI_ID } from '../../../../common/constants';
import type { StartServices } from '../../../types';

const timelineSearchParams = {
  isOpen: 'true',
  activeTab: 'discover',
};

export const useHeadlessRoutes = () => {
  const { application } = useKibana().services;
  if (application !== undefined) {
    const { hash, search } = window.location;
    const currentSearchParams = new URLSearchParams(search);
    currentSearchParams.set('timeline', encode(timelineSearchParams));
    const searchString = decodeURIComponent(currentSearchParams.toString());
    const pathWithSearchAndHash = hash ? `?${searchString}#${hash}` : `?${searchString}`;
    application.navigateToApp(APP_UI_ID, {
      deepLinkId: 'alerts',
      path: pathWithSearchAndHash,
      replace: true,
    });
  }
};

const HeadlessRouter = () => {
  useHeadlessRoutes();
  return null;
};

export const DiscoverRedirect = ({ services }: { services: StartServices }) => {
  return (
    <KibanaContextProvider services={services}>
      <HeadlessRouter />
    </KibanaContextProvider>
  );
};

export const renderApp = ({
  element,
  core,
  services,
}: {
  element: HTMLElement;
  core: CoreStart;
  services: StartServices;
}) => {
  const unmount = toMountPoint(<DiscoverRedirect services={services} />, {
    theme: core.theme,
    i18n: core.i18n,
  })(element);

  return () => {
    unmount();
  };
};
