/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Redirect, Route, Switch, useLocation } from 'react-router-dom';

import { Location } from 'history';
import { useActions, useValues } from 'kea';

import { LicensingLogic } from '../../../shared/licensing';
import { AppLogic } from '../../app_logic';
import {
  ADD_GITHUB_VIA_APP_PATH,
  ADD_GITHUB_ENTERPRISE_SERVER_VIA_APP_PATH,
  ADD_SOURCE_PATH,
  SOURCE_DETAILS_PATH,
  PRIVATE_SOURCES_PATH,
  SOURCES_PATH,
  getSourcesPath,
} from '../../routes';
import { SourceDataItem } from '../../types';

import { AddSource, AddSourceList, GitHubViaApp } from './components/add_source';
import { OrganizationSources } from './organization_sources';
import { PrivateSources } from './private_sources';
import { staticSourceConfig } from './source_data';
import { SourceRouter } from './source_router';
import { SourcesLogic } from './sources_logic';

import './sources.scss';

export const SourcesRouter: React.FC = () => {
  const { pathname } = useLocation() as Location;
  const { hasPlatinumLicense } = useValues(LicensingLogic);
  const { resetSourcesState } = useActions(SourcesLogic);
  const {
    account: { canCreatePrivateSources },
    isOrganization,
  } = useValues(AppLogic);

  /**
   * React router is not triggering the useEffect callback function in Sources when child links are clicked so this
   * is needed to ensure that the sources state is reset whenever the app changes routes.
   */
  useEffect(() => {
    resetSourcesState();
  }, [pathname]);

  /**
   * When opening `workplace_search/p/sources/add` as a bookmark or reloading this page,
   * Sources router first get rendered *before* it receives the canCreatePrivateSources value.
   * This results in canCreatePrivateSources always being undefined on the first render,
   * and user always getting redirected to `workplace_search/p/sources`.
   * Here we check for this value being present before we render any routes.
   */
  if (canCreatePrivateSources === undefined) {
    return null;
  }

  // TODO: currently just flattening everything, but should create hierarchical routes once Connectors 2.0 is more mature
  const sources = staticSourceConfig.reduce(
    (prev, curr) => [
      ...prev,
      ...([curr.internal, curr.external, curr.custom].filter((val) => !!val) as SourceDataItem[]),
    ],
    [] as SourceDataItem[]
  );

  return (
    <Switch>
      <Route exact path={PRIVATE_SOURCES_PATH}>
        <PrivateSources />
      </Route>
      <Route exact path={SOURCES_PATH}>
        <OrganizationSources />
      </Route>
      <Route exact path={ADD_GITHUB_VIA_APP_PATH}>
        <GitHubViaApp isGithubEnterpriseServer={false} />
      </Route>
      <Route exact path={ADD_GITHUB_ENTERPRISE_SERVER_VIA_APP_PATH}>
        <GitHubViaApp isGithubEnterpriseServer />
      </Route>
      {sources.map((sourceData, i) => {
        const { addPath, accountContextOnly } = sourceData;
        return (
          <Route key={i} exact path={getSourcesPath(addPath, isOrganization)}>
            {!hasPlatinumLicense && accountContextOnly ? (
              <Redirect exact from={ADD_SOURCE_PATH} to={SOURCES_PATH} />
            ) : (
              <AddSource sourceData={sourceData} />
            )}
          </Route>
        );
      })}
      {sources.map((sourceData, i) => (
        <Route key={i} exact path={`${getSourcesPath(sourceData.addPath, isOrganization)}/connect`}>
          <AddSource connect sourceData={sourceData} />
        </Route>
      ))}
      {sources.map((sourceData, i) => (
        <Route
          key={i}
          exact
          path={`${getSourcesPath(sourceData.addPath, isOrganization)}/reauthenticate`}
        >
          <AddSource reAuthenticate sourceData={sourceData} />
        </Route>
      ))}
      {sources.map((sourceData, i) => {
        if (sourceData.configuration.needsConfiguration)
          return (
            <Route
              key={i}
              exact
              path={`${getSourcesPath(sourceData.addPath, isOrganization)}/configure`}
            >
              <AddSource configure sourceData={sourceData} />
            </Route>
          );
      })}
      {canCreatePrivateSources ? (
        <Route exact path={getSourcesPath(ADD_SOURCE_PATH, false)}>
          <AddSourceList />
        </Route>
      ) : (
        <Redirect exact from={getSourcesPath(ADD_SOURCE_PATH, false)} to={PRIVATE_SOURCES_PATH} />
      )}
      <Route exact path={getSourcesPath(ADD_SOURCE_PATH, true)}>
        <AddSourceList />
      </Route>
      <Route path={getSourcesPath(SOURCE_DETAILS_PATH, isOrganization)}>
        <SourceRouter />
      </Route>
    </Switch>
  );
};
