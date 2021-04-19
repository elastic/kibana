/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';

import { useActions } from 'kea';

import { FlashMessages } from '../../../shared/flash_messages';
import { SetWorkplaceSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { NAV } from '../../constants';
import {
  ORG_SETTINGS_PATH,
  ORG_SETTINGS_CUSTOMIZE_PATH,
  ORG_SETTINGS_CONNECTORS_PATH,
  ORG_SETTINGS_OAUTH_APPLICATION_PATH,
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
    <>
      <FlashMessages />
      <Switch>
        <Redirect exact from={ORG_SETTINGS_PATH} to={ORG_SETTINGS_CUSTOMIZE_PATH} />
        <Route exact path={ORG_SETTINGS_CUSTOMIZE_PATH}>
          <SetPageChrome trail={[NAV.SETTINGS]} />
          <Customize />
        </Route>
        <Route exact path={ORG_SETTINGS_CONNECTORS_PATH}>
          <SetPageChrome trail={[NAV.SETTINGS, NAV.SETTINGS_SOURCE_PRIORITIZATION]} />
          <Connectors />
        </Route>
        <Route exact path={ORG_SETTINGS_OAUTH_APPLICATION_PATH}>
          <SetPageChrome trail={[NAV.SETTINGS, NAV.SETTINGS_OAUTH]} />
          <OauthApplication />
        </Route>
        {staticSourceData.map(({ editPath }, i) => (
          <Route key={i} exact path={editPath}>
            <SourceConfig sourceIndex={i} />
          </Route>
        ))}
      </Switch>
    </>
  );
};
