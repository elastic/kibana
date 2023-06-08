/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { Router, type RouteProps } from 'react-router-dom';
import { type Location } from 'history';

import type {
  AppMountParameters,
  IUiSettingsClient,
  ChromeStart,
  ChromeBreadcrumb,
} from '@kbn/core/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';

import { EuiSkeletonText } from '@elastic/eui';
import { UrlStateProvider } from '@kbn/ml-url-state';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { SavedObjectsClientContract } from '@kbn/core/public';
import { MlNotificationsContextProvider } from '../contexts/ml/ml_notifications_context';
import { MlContext, MlContextValue } from '../contexts/ml';

import { MlPage } from '../components/ml_page';
import { MlPages } from '../../locator';

// custom RouteProps making location non-optional
interface MlRouteProps extends RouteProps {
  location: Location;
}

export interface MlRoute {
  /**
   * Route ID.
   * Used for tab IDs
   */
  id?: string;
  path: string;
  /**
   * Route name.
   * Used for side nav items and page titles.
   */
  title?: string;
  render(props: MlRouteProps, deps: PageDependencies): JSX.Element;
  breadcrumbs: ChromeBreadcrumb[];
  /**
   * Indicated if page contains a global date picker.
   */
  enableDatePicker?: boolean;
  'data-test-subj'?: string;
  actionMenu?: React.ReactNode;
  disabled?: boolean;
}

export interface PageProps {
  location: Location;
  deps: PageDependencies;
}

export interface PageDependencies {
  config: IUiSettingsClient;
  history: AppMountParameters['history'];
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  dataViewsContract: DataViewsContract;
  setBreadcrumbs: ChromeStart['setBreadcrumbs'];
  redirectToMlAccessDeniedPage: () => Promise<void>;
  getSavedSearchDeps: {
    search: DataPublicPluginStart['search'];
    savedObjectsClient: SavedObjectsClientContract;
  };
}

export const PageLoader: FC<{ context: MlContextValue }> = ({ context, children }) => {
  return (
    <EuiSkeletonText lines={10} isLoading={context === null}>
      <MlContext.Provider value={context}>{children}</MlContext.Provider>
    </EuiSkeletonText>
  );
};

/**
 * `MlRouter` is based on `BrowserRouter` and takes in `ScopedHistory` provided
 * by Kibana. `LegacyHashUrlRedirect` provides compatibility with legacy hash based URLs.
 * `UrlStateProvider` manages state stored in `_g/_a` URL parameters which can be
 * use in components further down via `useUrlState()`.
 */
export const MlRouter: FC<{
  pageDeps: PageDependencies;
}> = ({ pageDeps }) => (
  <Router history={pageDeps.history}>
    <UrlStateProvider>
      <MlNotificationsContextProvider>
        <MlPage pageDeps={pageDeps} />
      </MlNotificationsContextProvider>
    </UrlStateProvider>
  </Router>
);

export function createPath(page: MlPages, additionalPrefix?: string) {
  return `/${page}${additionalPrefix ? `${additionalPrefix}` : ''}`;
}
