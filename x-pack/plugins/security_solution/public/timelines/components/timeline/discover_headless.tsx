/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { once } from 'lodash';
import { createHashHistory, createBrowserHistory } from 'history';
import { useLocation } from 'react-router-dom';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { KibanaContextProvider, useKibana } from '@kbn/kibana-react-plugin/public';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { encode } from '@kbn/rison';
import { APP_UI_ID } from '../../../../common/constants';

interface HistoryLocationState {
  referrer: string;
}

export const getHistory = once(() => {
  const history = createHashHistory<HistoryLocationState>();
  history.listen(() => {
    // keep at least one listener so that `history.location` always in sync
  });
  return history;
});

// Pass these via config or?
const timelineSearchParams = {
  isOpen: 'true',
  activeTab: 'discover',
};

export const useHeadlessRoutes = () => {
  const { application } = useKibana().services;
  const location = useLocation();
  if (application !== undefined) {
    const { hash, search } = location;
    const currentSearchParams = new URLSearchParams(search);
    currentSearchParams.set('timeline', encode(timelineSearchParams));
    const searchString = decodeURIComponent(currentSearchParams.toString());
    const pathWithSearchAndHash = hash ? `?${searchString}#${hash}` : `?${searchString}`;
    const newUrl = application.getUrlForApp(APP_UI_ID, {
      deepLinkId: 'alerts',
      path: pathWithSearchAndHash,
    });
    application.navigateToUrl(newUrl);
  }
};

const HeadlessRouter = () => {
  useHeadlessRoutes();
  return null;
};

export const DiscoverRedirect = ({ services }) => {
  const { history } = services;
  const browserHistory = createBrowserHistory();
  return (
    <KibanaContextProvider services={services}>
      <Router history={browserHistory} data-test-subj="discover-headless-react-router">
        <Routes>
          <Route>
            <HeadlessRouter />
          </Route>
        </Routes>
      </Router>
    </KibanaContextProvider>
  );
};

export const renderApp = ({ element, core, services }) => {
  const history = getHistory();
  const unmount = toMountPoint(<DiscoverRedirect services={{ ...services, history }} />, {
    theme: core.theme,
    i18n: core.i18n,
  })(element);

  return () => {
    unmount();
    // data.search.session.clear();
  };
};
