/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';

import { useValues } from 'kea';

import { Routes, Route } from '@kbn/shared-ux-router';

import { isVersionMismatch } from '../../../common/is_version_mismatch';
import { InitialAppData } from '../../../common/types';
import { SetupGuide } from '../enterprise_search_overview/components/setup_guide';
import { ErrorStatePrompt } from '../shared/error_state';
import { HttpLogic } from '../shared/http';
import { KibanaLogic } from '../shared/kibana';
import { VersionMismatchPage } from '../shared/version_mismatch';

import { NotFound } from './components/not_found';
import { SearchIndicesRouter } from './components/search_indices';
import { Settings } from './components/settings';
import {
  SETUP_GUIDE_PATH,
  ROOT_PATH,
  SEARCH_INDICES_PATH,
  SETTINGS_PATH,
  ERROR_STATE_PATH,
} from './routes';

export const EnterpriseSearchContent: React.FC<InitialAppData> = (props) => {
  const { config } = useValues(KibanaLogic);
  const { errorConnectingMessage } = useValues(HttpLogic);
  const { enterpriseSearchVersion, kibanaVersion } = props;
  const incompatibleVersions = isVersionMismatch(enterpriseSearchVersion, kibanaVersion);

  const showView = () => {
    if (config.host && config.canDeployEntSearch && incompatibleVersions) {
      return (
        <VersionMismatchPage
          enterpriseSearchVersion={enterpriseSearchVersion}
          kibanaVersion={kibanaVersion}
        />
      );
    }

    return <EnterpriseSearchContentConfigured {...(props as Required<InitialAppData>)} />;
  };

  return (
    <Routes>
      <Route exact path={SETUP_GUIDE_PATH}>
        <SetupGuide />
      </Route>
      <Route exact path={ERROR_STATE_PATH}>
        {config.host && config.canDeployEntSearch && errorConnectingMessage ? (
          <ErrorStatePrompt />
        ) : (
          <Redirect to={SEARCH_INDICES_PATH} />
        )}
      </Route>
      <Route>{showView()}</Route>
    </Routes>
  );
};

export const EnterpriseSearchContentConfigured: React.FC<Required<InitialAppData>> = () => {
  return (
    <Routes>
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
    </Routes>
  );
};
