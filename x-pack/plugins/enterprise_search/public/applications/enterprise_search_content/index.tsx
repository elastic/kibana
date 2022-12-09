/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Navigate, Routes } from 'react-router-dom';

import { useValues } from 'kea';

import { isVersionMismatch } from '../../../common/is_version_mismatch';
import { InitialAppData } from '../../../common/types';
import { SetupGuide } from '../enterprise_search_overview/components/setup_guide';
import { HttpLogic } from '../shared/http';
import { KibanaLogic } from '../shared/kibana';
import { VersionMismatchPage } from '../shared/version_mismatch';

import { EnginesRouter } from './components/engines/engines_router';
import { ErrorConnecting } from './components/error_connecting';
import { NotFound } from './components/not_found';
import { SearchIndicesRouter } from './components/search_indices';
import { Settings } from './components/settings';
import {
  SETUP_GUIDE_PATH,
  SEARCH_INDICES_PATH,
  SETTINGS_PATH,
  ENGINES_PATH,
  ROOT_PATH,
} from './routes';

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
    <Routes>
      <Route path={SETUP_GUIDE_PATH} element={<SetupGuide />} />
      <Route element={showView()} />
    </Routes>
  );
};

export const EnterpriseSearchContentUnconfigured: React.FC = () => (
  <Routes>
    <Route element={<Navigate to={SETUP_GUIDE_PATH} />} />
  </Routes>
);

export const EnterpriseSearchContentConfigured: React.FC<Required<InitialAppData>> = () => {
  return (
    <Routes>
      <Route path={ROOT_PATH} element={<Navigate to={SEARCH_INDICES_PATH} />} />
      <Route path={SEARCH_INDICES_PATH} element={<SearchIndicesRouter />} />
      <Route path={SETTINGS_PATH} element={<Settings />} />
      <Route path={ENGINES_PATH} element={<EnginesRouter />} />
      <Route element={<NotFound />} />
    </Routes>
  );
};
