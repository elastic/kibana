/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect } from 'react';
import { Route, Switch, useHistory } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { parse } from 'query-string';
import { uiSelector } from './state/selectors';
import { setUiState } from './state/actions';
import { getSupportedUrlParams } from './lib/helper';
import { OverviewPage } from './components/overview/overview_container';
import {
  CERTIFICATES_ROUTE,
  MONITOR_ROUTE,
  OVERVIEW_ROUTE,
  SETTINGS_ROUTE,
} from '../common/constants';
import { MonitorPage, NotFoundPage, SettingsPage } from './pages';
import { CertificatesPage } from './pages/certificates';
import { UptimePage, useUptimeTelemetry, useUrlParams } from './hooks';
import { resolveStateChanges, resolveUrlUpdates } from './lib/helper/url_params';

interface RouteProps {
  path: string;
  component: React.FC;
  dataTestSubj: string;
  title: string;
  telemetryId: UptimePage;
}

const baseTitle = 'Uptime - Kibana';

const Routes: RouteProps[] = [
  {
    title: `Monitor | ${baseTitle}`,
    path: MONITOR_ROUTE,
    component: MonitorPage,
    dataTestSubj: 'uptimeMonitorPage',
    telemetryId: UptimePage.Monitor,
  },
  {
    title: `Settings | ${baseTitle}`,
    path: SETTINGS_ROUTE,
    component: SettingsPage,
    dataTestSubj: 'uptimeSettingsPage',
    telemetryId: UptimePage.Settings,
  },
  {
    title: `Certificates | ${baseTitle}`,
    path: CERTIFICATES_ROUTE,
    component: CertificatesPage,
    dataTestSubj: 'uptimeCertificatesPage',
    telemetryId: UptimePage.Certificates,
  },
  {
    title: baseTitle,
    path: OVERVIEW_ROUTE,
    component: OverviewPage,
    dataTestSubj: 'uptimeOverviewPage',
    telemetryId: UptimePage.Overview,
  },
];

const RouteInit: React.FC<Pick<RouteProps, 'path' | 'title' | 'telemetryId'>> = ({
  path,
  title,
  telemetryId,
}) => {
  useUptimeTelemetry(telemetryId);
  useEffect(() => {
    document.title = title;
  }, [path, title]);
  return null;
};

export const PageRouter: FC = () => {
  useSynchronizedState();
  return (
    <Switch>
      {Routes.map(({ title, path, component: RouteComponent, dataTestSubj, telemetryId }) => (
        <Route path={path} key={telemetryId}>
          <div data-test-subj={dataTestSubj}>
            <RouteInit title={title} path={path} telemetryId={telemetryId} />
            <RouteComponent />
          </div>
        </Route>
      ))}
      <Route component={NotFoundPage} />
    </Switch>
  );
};

/**
 * This is a hook dedicated for the router. It synchronizes the state store
 * and the URL parameters from one place. The main purpose is to make it
 * so application components can remain agnostic to the values in the URL.
 */
const useSynchronizedState = () => {
  const [get, set] = useUrlParams();
  const params = get();
  const history = useHistory();
  const storeState = useSelector(uiSelector);
  const dispatch = useDispatch();
  useEffect(() => {
    const uiStateDelta = resolveStateChanges(params, storeState);
    if (Object.keys(uiStateDelta).length > 0) {
      dispatch(setUiState(uiStateDelta));
    }
    /*
     * We only want this effect to fire on initial render, so we can
     * override default store values with initial URL params. Subsequent
     * updates are performed in the history listener below.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    history.listen((newHistory) => {
      const supportedParams = getSupportedUrlParams(parse(newHistory.search));
      const uiStateDelta = resolveStateChanges(supportedParams, storeState);
      if (Object.keys(uiStateDelta).length > 0) {
        dispatch(setUiState(uiStateDelta));
      }
    });
  }, [dispatch, storeState, history]);

  useEffect(() => {
    const urlStateDelta = resolveUrlUpdates(params, storeState);
    if (Object.keys(urlStateDelta).length > 0) {
      set(urlStateDelta);
    }
  }, [params, storeState, set]);
};
