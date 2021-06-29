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
  ADD_SOURCE_PATH,
  SOURCE_DETAILS_PATH,
  PERSONAL_SOURCES_PATH,
  SOURCES_PATH,
  getSourcesPath,
} from '../../routes';

import { AddSource, AddSourceList } from './components/add_source';
import { OrganizationSources } from './organization_sources';
import { PrivateSources } from './private_sources';
import { staticSourceData } from './source_data';
import { SourceRouter } from './source_router';
import { SourcesLogic } from './sources_logic';

import './sources.scss';

export const SourcesRouter: React.FC = () => {
  const { pathname } = useLocation() as Location;
  const { hasPlatinumLicense } = useValues(LicensingLogic);
  const { resetSourcesState } = useActions(SourcesLogic);
  const {
    account: { canCreatePersonalSources },
    isOrganization,
  } = useValues(AppLogic);

  /**
   * React router is not triggering the useEffect callback function in Sources when child links are clicked so this
   * is needed to ensure that the sources state is reset whenever the app changes routes.
   */
  useEffect(() => {
    resetSourcesState();
  }, [pathname]);

  return (
    <Switch>
      <Route exact path={PERSONAL_SOURCES_PATH}>
        <PrivateSources />
      </Route>
      <Route exact path={SOURCES_PATH}>
        <OrganizationSources />
      </Route>
      {staticSourceData.map(({ addPath, accountContextOnly }, i) => (
        <Route key={i} exact path={getSourcesPath(addPath, isOrganization)}>
          {!hasPlatinumLicense && accountContextOnly ? (
            <Redirect exact from={ADD_SOURCE_PATH} to={SOURCES_PATH} />
          ) : (
            <AddSource sourceIndex={i} />
          )}
        </Route>
      ))}
      {staticSourceData.map(({ addPath }, i) => (
        <Route key={i} exact path={`${getSourcesPath(addPath, isOrganization)}/connect`}>
          <AddSource connect sourceIndex={i} />
        </Route>
      ))}
      {staticSourceData.map(({ addPath }, i) => (
        <Route key={i} exact path={`${getSourcesPath(addPath, isOrganization)}/reauthenticate`}>
          <AddSource reAuthenticate sourceIndex={i} />
        </Route>
      ))}
      {staticSourceData.map(({ addPath, configuration: { needsConfiguration } }, i) => {
        if (needsConfiguration)
          return (
            <Route key={i} exact path={`${getSourcesPath(addPath, isOrganization)}/configure`}>
              <AddSource configure sourceIndex={i} />
            </Route>
          );
      })}
      {canCreatePersonalSources ? (
        <Route exact path={getSourcesPath(ADD_SOURCE_PATH, false)}>
          <AddSourceList />
        </Route>
      ) : (
        <Redirect exact from={getSourcesPath(ADD_SOURCE_PATH, false)} to={PERSONAL_SOURCES_PATH} />
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
