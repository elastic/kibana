/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Route, Navigate, Routes } from 'react-router-dom';

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
    <Routes>
      <Route path={SETUP_GUIDE_PATH} element={<SetupGuide />} />
      <Route element={showView()} />
    </Routes>
  );
};

export const AppSearchUnconfigured: React.FC = () => (
  <Routes>
    <Route>
      <Navigate to={SETUP_GUIDE_PATH} />
    </Route>
  </Routes>
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
    <Routes>
      {process.env.NODE_ENV === 'development' && (
        <Route path={LIBRARY_PATH} element={<Library />} />
      )}
      <Route path={ROOT_PATH} element={<Navigate to={ENGINES_PATH} />} />
      <Route path={ENGINES_PATH} element={<EnginesOverview />} />

      {canManageEngines && <Route path={ENGINE_CREATION_PATH} element={<EngineCreation />} />}
      {canManageMetaEngines && (
        <Route path={META_ENGINE_CREATION_PATH} element={<MetaEngineCreation />} />
      )}
      <Route path={ENGINE_PATH} element={<EngineRouter />} />
      {canViewSettings && <Route path={SETTINGS_PATH} element={<Settings />} />}
      {canViewAccountCredentials && <Route path={CREDENTIALS_PATH} element={<Credentials />} />}
      {canViewRoleMappings && <Route path={USERS_AND_ROLES_PATH} element={<RoleMappings />} />}
      <Route element={<NotFound />} />
    </Routes>
  );
};
