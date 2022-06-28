/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Route, Redirect, Switch } from 'react-router-dom';

import { useValues } from 'kea';

import { isVersionMismatch } from '../../../common/is_version_mismatch';
import { InitialAppData } from '../../../common/types';
import { HttpLogic } from '../shared/http';
import { KibanaLogic } from '../shared/kibana';
import { VersionMismatchPage } from '../shared/version_mismatch';

import { AppLogic } from './app_logic';
import { Credentials } from './components/credentials';
import { EngineRouter } from './components/engine';
import { EngineCreation } from './components/engine_creation';
import { EnginesOverview } from './components/engines';
import { ErrorConnecting } from './components/error_connecting';
import { KibanaHeaderActions } from './components/layout';
import { Library } from './components/library';
import { MetaEngineCreation } from './components/meta_engine_creation';
import { NotFound } from './components/not_found';
import { RoleMappings } from './components/role_mappings';
import { Settings } from './components/settings';
import { SetupGuide } from './components/setup_guide';
import {
  ENGINE_CREATION_PATH,
  ROOT_PATH,
  SETUP_GUIDE_PATH,
  SETTINGS_PATH,
  CREDENTIALS_PATH,
  USERS_AND_ROLES_PATH,
  ENGINES_PATH,
  ENGINE_PATH,
  LIBRARY_PATH,
  META_ENGINE_CREATION_PATH,
} from './routes';

export const AppSearch: React.FC<InitialAppData> = (props) => {
  const { config } = useValues(KibanaLogic);
  const { errorConnectingMessage } = useValues(HttpLogic);
  const { enterpriseSearchVersion, kibanaVersion } = props;
  const incompatibleVersions = isVersionMismatch(enterpriseSearchVersion, kibanaVersion);

  const showView = () => {
    if (!config.host) {
      return <AppSearchUnconfigured />;
    } else if (incompatibleVersions) {
      return (
        <VersionMismatchPage
          enterpriseSearchVersion={enterpriseSearchVersion}
          kibanaVersion={kibanaVersion}
        />
      );
    } else if (errorConnectingMessage) {
      return <ErrorConnecting />;
    }

    return <AppSearchConfigured {...(props as Required<InitialAppData>)} />;
  };

  return (
    <Switch>
      <Route exact path={SETUP_GUIDE_PATH}>
        <SetupGuide />
      </Route>
      <Route>{showView()}</Route>
    </Switch>
  );
};

export const AppSearchUnconfigured: React.FC = () => (
  <Switch>
    <Route>
      <Redirect to={SETUP_GUIDE_PATH} />
    </Route>
  </Switch>
);

export const AppSearchConfigured: React.FC<Required<InitialAppData>> = (props) => {
  const {
    myRole: {
      canManageEngines,
      canManageMetaEngines,
      canViewSettings,
      canViewAccountCredentials,
      canViewRoleMappings,
    },
  } = useValues(AppLogic(props));
  const { renderHeaderActions } = useValues(KibanaLogic);

  useEffect(() => {
    renderHeaderActions(KibanaHeaderActions);
  }, []);

  return (
    <Switch>
      {process.env.NODE_ENV === 'development' && (
        <Route path={LIBRARY_PATH}>
          <Library />
        </Route>
      )}
      <Route exact path={ROOT_PATH}>
        <Redirect to={ENGINES_PATH} />
      </Route>
      <Route exact path={ENGINES_PATH}>
        <EnginesOverview />
      </Route>
      {canManageEngines && (
        <Route exact path={ENGINE_CREATION_PATH}>
          <EngineCreation />
        </Route>
      )}
      {canManageMetaEngines && (
        <Route exact path={META_ENGINE_CREATION_PATH}>
          <MetaEngineCreation />
        </Route>
      )}
      <Route path={ENGINE_PATH}>
        <EngineRouter />
      </Route>
      {canViewSettings && (
        <Route exact path={SETTINGS_PATH}>
          <Settings />
        </Route>
      )}
      {canViewAccountCredentials && (
        <Route exact path={CREDENTIALS_PATH}>
          <Credentials />
        </Route>
      )}
      {canViewRoleMappings && (
        <Route path={USERS_AND_ROLES_PATH}>
          <RoleMappings />
        </Route>
      )}
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
};
