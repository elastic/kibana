/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { useValues } from 'kea';
import { Route, Switch } from 'react-router-dom';

import { AppLogic } from '../../../../app_logic';

import {
  DISPLAY_SETTINGS_RESULT_DETAIL_PATH,
  DISPLAY_SETTINGS_SEARCH_RESULT_PATH,
  getSourcesPath,
} from '../../../../routes';

import { DisplaySettings } from './display_settings';

export const DisplaySettingsRouter: React.FC = () => {
  const { isOrganization } = useValues(AppLogic);
  return (
    <Switch>
      <Route
        exact
        path={getSourcesPath(DISPLAY_SETTINGS_SEARCH_RESULT_PATH, isOrganization)}
        render={() => <DisplaySettings tabId={0} />}
      />
      <Route
        exact
        path={getSourcesPath(DISPLAY_SETTINGS_RESULT_DETAIL_PATH, isOrganization)}
        render={() => <DisplaySettings tabId={1} />}
      />
    </Switch>
  );
};
