/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { useActions } from 'kea';

import {
  ORG_SETTINGS_CUSTOMIZE_PATH,
  ORG_SETTINGS_CONNECTORS_PATH,
  ORG_SETTINGS_OAUTH_APPLICATION_PATH,
  getEditPath,
} from '../../routes';

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
    <Routes>
      <Route path={ORG_SETTINGS_CUSTOMIZE_PATH} element={<Customize />} />
      <Route path={ORG_SETTINGS_CONNECTORS_PATH} element={<Connectors />} />
      <Route path={ORG_SETTINGS_OAUTH_APPLICATION_PATH} element={<OauthApplication />} />
      <Route path={getEditPath(':serviceType')} element={<SourceConfig />} />
      <Route element={<Navigate to={ORG_SETTINGS_CUSTOMIZE_PATH} />} />
    </Routes>
  );
};
