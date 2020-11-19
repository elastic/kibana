/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

import { Location } from 'history';
import { useActions, useValues } from 'kea';
import { Redirect, Route, Switch, useLocation } from 'react-router-dom';

import {
  ADD_SOURCE_PATH,
  SOURCE_ADDED_PATH,
  SOURCE_DETAILS_PATH,
  ORG_PATH,
  ORG_SOURCES_PATH,
  SOURCES_PATH,
  getSourcesPath,
} from 'workplace_search/utils/routePaths';

import { AppLogic } from 'workplace_search/App/AppLogic';
import { staticSourceData } from './sourceData';
import { SourcesLogic } from './SourcesLogic';

import { AddSource, AddSourceList } from './components/AddSource';
import { SourceAdded } from './components/SourceAdded';
import { OrganizationSources } from './OrganizationSources';
import { PrivateSources } from './PrivateSources';
import { SourceRouter } from './SourceRouter';

export const SourcesRouter: React.FC = () => {
  const { pathname } = useLocation() as Location;
  const { resetSourcesState } = useActions(SourcesLogic);
  const {
    fpAccount: { canCreatePersonalSources, minimumPlatinumLicense },
  } = useValues(AppLogic);

  /**
   * React router is not triggering the useEffect callback function in Sources when child links are clicked so this
   * is needed to ensure that the sources state is reset whenever the app changes routes.
   */
  useEffect(() => {
    resetSourcesState();
  }, [pathname]);

  const isOrgRoute = pathname.includes(ORG_PATH);

  return (
    <Switch>
      <Route exact path={SOURCES_PATH} component={PrivateSources} />
      <Route exact path={ORG_SOURCES_PATH} component={OrganizationSources} />
      {staticSourceData.map(({ addPath, accountContextOnly }, i) => (
        <Route
          key={i}
          exact
          path={getSourcesPath(addPath, isOrgRoute)}
          render={() =>
            !minimumPlatinumLicense && accountContextOnly ? (
              <Redirect exact from={ADD_SOURCE_PATH} to={ORG_SOURCES_PATH} />
            ) : (
              <AddSource sourceIndex={i} />
            )
          }
        />
      ))}
      {staticSourceData.map(({ addPath }, i) => (
        <Route
          key={i}
          exact
          path={`${getSourcesPath(addPath, isOrgRoute)}/connect`}
          render={() => <AddSource connect sourceIndex={i} />}
        />
      ))}
      {staticSourceData.map(({ addPath }, i) => (
        <Route
          key={i}
          exact
          path={`${getSourcesPath(addPath, isOrgRoute)}/re-authenticate`}
          render={() => <AddSource reAuthenticate sourceIndex={i} />}
        />
      ))}
      {staticSourceData.map(({ addPath, configuration: { needsConfiguration } }, i) => {
        if (needsConfiguration)
          return (
            <Route
              key={i}
              exact
              path={`${getSourcesPath(addPath, isOrgRoute)}/configure`}
              render={() => <AddSource configure sourceIndex={i} />}
            />
          );
      })}
      {canCreatePersonalSources ? (
        <Route exact path={ADD_SOURCE_PATH} component={AddSourceList} />
      ) : (
        <Redirect exact from={ADD_SOURCE_PATH} to={SOURCES_PATH} />
      )}
      <Route exact path={getSourcesPath(ADD_SOURCE_PATH, true)} component={AddSourceList} /> :
      <Route path={getSourcesPath(SOURCE_ADDED_PATH, isOrgRoute)} exact component={SourceAdded} />
      <Route path={getSourcesPath(SOURCE_DETAILS_PATH, isOrgRoute)} component={SourceRouter} />
    </Switch>
  );
};
