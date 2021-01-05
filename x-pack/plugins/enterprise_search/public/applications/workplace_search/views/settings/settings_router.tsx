/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

import { useActions } from 'kea';
import { Redirect, Route, Switch, useLocation } from 'react-router-dom';

import {
  ORG_SETTINGS_PATH,
  ORG_SETTINGS_CUSTOMIZE_PATH,
  ORG_SETTINGS_CONNECTORS_PATH,
  ORG_SETTINGS_OAUTH_APPLICATION_PATH,
} from '../../routes';

import { FlashMessages, clearFlashMessages } from '../../../shared/flash_messages';

import { Connectors } from './components/connectors';
import { Customize } from './components/customize';
import { OauthApplication } from './components/oauth_application';
import { SourceConfig } from './components/source_config';

import { staticSourceData } from '../content_sources/source_data';

import { SettingsLogic } from './settings_logic';

export const SettingsRouter: React.FC = () => {
  const { pathname } = useLocation();
  const { initializeSettings } = useActions(SettingsLogic);

  useEffect(() => {
    initializeSettings();
  }, []);

  useEffect(() => {
    clearFlashMessages();
  }, [pathname]);

  return (
    <>
      <FlashMessages />
      <Switch>
        <Redirect exact from={ORG_SETTINGS_PATH} to={ORG_SETTINGS_CUSTOMIZE_PATH} />
        <Route exact path={ORG_SETTINGS_CUSTOMIZE_PATH} component={Customize} />
        <Route exact path={ORG_SETTINGS_CONNECTORS_PATH} component={Connectors} />
        <Route exact path={ORG_SETTINGS_OAUTH_APPLICATION_PATH} component={OauthApplication} />
        {staticSourceData.map(({ editPath }, i) => (
          <Route key={i} exact path={editPath} render={() => <SourceConfig sourceIndex={i} />} />
        ))}
      </Switch>
    </>
  );
};
