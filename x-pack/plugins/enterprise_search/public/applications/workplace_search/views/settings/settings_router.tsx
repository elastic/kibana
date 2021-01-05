/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';
import { Redirect, Route, Switch, useLocation } from 'react-router-dom';

import {
  ORG_SETTINGS_PATH,
  ORG_SETTINGS_CUSTOMIZE_PATH,
  ORG_SETTINGS_CONNECTORS_PATH,
  ORG_SETTINGS_OAUTH_APPLICATION_PATH,
} from 'workplace_search/utils/routePaths';

import { SidebarNavigation, AppView } from 'workplace_search/components';

import FlashMessages from 'shared/components/FlashMessages';

import Connectors from './components/Connectors';
import Customize from './components/Customize';
import OauthApplication from './components/OauthApplication';
import SourceConfig from './components/SourceConfig';

import { staticSourceData } from '../ContentSources/sourceData';

import { SettingsLogic, SettingsServerProps } from './SettingsLogic';

export const SettingsRouter: React.FC = () => {
  const { pathname } = useLocation();
  const { resetFlashMessages, initializeSettings } = useActions(SettingsLogic);
  const { flashMessages } = useValues(SettingsLogic);

  useEffect(() => {
    initializeSettings();
  }, []);

  useEffect(() => {
    resetFlashMessages();
  }, [pathname]);

  const customizeLink = {
    title: 'Customize Workplace Search',
    path: ORG_SETTINGS_CUSTOMIZE_PATH,
  };

  const sourcePrioritizationLink = {
    title: 'Content source connectors',
    path: ORG_SETTINGS_CONNECTORS_PATH,
    dataTestSubj: 'ConnectorsLink',
  };
  const oauthApplicationLink = {
    title: 'OAuth application',
    path: ORG_SETTINGS_OAUTH_APPLICATION_PATH,
    dataTestSubj: 'OAuthLink',
  };

  const links = [customizeLink, sourcePrioritizationLink, oauthApplicationLink];

  const sidebar = (
    <SidebarNavigation
      title="Organization settings"
      description="Manage content sources and other settings for your organization."
      links={links}
    />
  );

  return (
    <AppView sidebar={sidebar}>
      {flashMessages && <FlashMessages {...flashMessages} />}
      <Switch>
        <Redirect exact from={ORG_SETTINGS_PATH} to={ORG_SETTINGS_CUSTOMIZE_PATH} />
        <Route exact path={ORG_SETTINGS_CUSTOMIZE_PATH} component={Customize} />
        <Route exact path={ORG_SETTINGS_CONNECTORS_PATH} component={Connectors} />
        <Route exact path={ORG_SETTINGS_OAUTH_APPLICATION_PATH} component={OauthApplication} />
        {staticSourceData.map(({ editPath }, i) => (
          <Route key={i} exact path={editPath} render={() => <SourceConfig sourceIndex={i} />} />
        ))}
      </Switch>
    </AppView>
  );
};
