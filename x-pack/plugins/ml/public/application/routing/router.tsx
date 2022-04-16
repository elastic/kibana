/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, FC } from 'react';
import { useHistory, useLocation, Router, RouteProps } from 'react-router-dom';
import { Location } from 'history';

import type {
  AppMountParameters,
  IUiSettingsClient,
  ChromeStart,
  ChromeBreadcrumb,
} from '@kbn/core/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';

import { EuiLoadingContent } from '@elastic/eui';
import { MlContext, MlContextValue } from '../contexts/ml';
import { UrlStateProvider } from '../util/url_state';

import { MlPage } from '../components/ml_page';

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
}

export const PageLoader: FC<{ context: MlContextValue }> = ({ context, children }) => {
  return context === null ? (
    <EuiLoadingContent lines={10} />
  ) : (
    <MlContext.Provider value={context}>{children}</MlContext.Provider>
  );
};

/**
 * This component provides compatibility with the previous hash based
 * URL format used by HashRouter. Even if we migrate all internal URLs
 * to one without hashes, we should keep this redirect in place to
 * support legacy bookmarks and as a fallback for unmigrated URLs
 * from other plugins.
 */
const LegacyHashUrlRedirect: FC = ({ children }) => {
  const history = useHistory();
  const location = useLocation();

  useEffect(() => {
    if (location.hash.startsWith('#/')) {
      history.push(location.hash.replace('#', ''));
    }
  }, [location.hash]);

  return <>{children}</>;
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
    <LegacyHashUrlRedirect>
      <UrlStateProvider>
        <MlPage pageDeps={pageDeps} />
      </UrlStateProvider>
    </LegacyHashUrlRedirect>
  </Router>
);
