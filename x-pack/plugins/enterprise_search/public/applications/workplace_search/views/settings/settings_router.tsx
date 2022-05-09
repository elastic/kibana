/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';

import { useActions } from 'kea';

import {
  ORG_SETTINGS_CUSTOMIZE_PATH,
  ORG_SETTINGS_CONNECTORS_PATH,
  ORG_SETTINGS_OAUTH_APPLICATION_PATH,
  getEditPath,
} from '../../routes';
import { staticSourceData } from '../content_sources/source_data';

import { Connectors } from './components/connectors';
import { Customize } from './components/customize';
import { OauthApplication } from './components/oauth_application';
import { SourceConfig } from './components/source_config';
import { SettingsLogic } from './settings_logic';

export const SettingsRouter: React.FC = () => {
  const { initializeSettings } = useActions(SettingsLogic);

  useEffect(() => {
    initializeSettings();
  }, []);

  return (
    <Switch>
      <Route exact path={ORG_SETTINGS_CUSTOMIZE_PATH}>
        <Customize />
      </Route>
      <Route exact path={ORG_SETTINGS_CONNECTORS_PATH}>
        <Connectors />
      </Route>
      <Route exact path={ORG_SETTINGS_OAUTH_APPLICATION_PATH}>
        <OauthApplication />
      </Route>
      {staticSourceData.map((sourceData, i) => (
        <Route key={i} exact path={getEditPath(sourceData.serviceType)}>
          <SourceConfig sourceData={sourceData} />
        </Route>
      ))}
      <Route>
        <Redirect to={ORG_SETTINGS_CUSTOMIZE_PATH} />
      </Route>
    </Switch>
  );
};
