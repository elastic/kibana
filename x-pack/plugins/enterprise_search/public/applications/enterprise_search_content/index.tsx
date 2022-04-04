/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Redirect, Switch } from 'react-router-dom';

import { useValues } from 'kea';

import { isVersionMismatch } from '../../../common/is_version_mismatch';
import { InitialAppData } from '../../../common/types';
import { SetupGuide } from '../enterprise_search_overview/components/setup_guide';
import { HttpLogic } from '../shared/http';
import { KibanaLogic } from '../shared/kibana';
import { VersionMismatchPage } from '../shared/version_mismatch';

import { ErrorConnecting } from './components/error_connecting';
import { NotFound } from './components/not_found';
import { SearchIndicesRouter } from './components/search_indices';
import { Settings } from './components/settings';
import { SETUP_GUIDE_PATH, ROOT_PATH, SEARCH_INDICES_PATH, SETTINGS_PATH } from './routes';

export const EnterpriseSearchContent: React.FC<InitialAppData> = (props) => {
  const { config } = useValues(KibanaLogic);
  const { errorConnectingMessage } = useValues(HttpLogic);
  const { enterpriseSearchVersion, kibanaVersion } = props;
  const incompatibleVersions = isVersionMismatch(enterpriseSearchVersion, kibanaVersion);

  const showView = () => {
    if (!config.host) {
      return <EnterpriseSearchContentUnconfigured />;
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

    return <EnterpriseSearchContentConfigured {...(props as Required<InitialAppData>)} />;
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

export const EnterpriseSearchContentUnconfigured: React.FC = () => (
  <Switch>
    <Route>
      <Redirect to={SETUP_GUIDE_PATH} />
    </Route>
  </Switch>
);

export const EnterpriseSearchContentConfigured: React.FC<Required<InitialAppData>> = () => {
  return (
    <Switch>
      <Redirect exact from={ROOT_PATH} to={SEARCH_INDICES_PATH} />
      <Route path={SEARCH_INDICES_PATH}>
        <SearchIndicesRouter />
      </Route>
      <Route path={SETTINGS_PATH}>
        <Settings />
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
};
