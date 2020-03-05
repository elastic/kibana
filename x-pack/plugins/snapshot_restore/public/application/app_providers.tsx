/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { API_BASE_PATH } from '../../common/constants';
import { AuthorizationProvider } from './lib/authorization';
import { AppContextProvider, AppDependencies } from './app_context';

interface Props {
  appDependencies: AppDependencies;
  children: React.ReactNode;
}

export const AppProviders = ({ appDependencies, children }: Props) => {
  const { core } = appDependencies;
  const {
    i18n: { Context: I18nContext },
  } = core;

  return (
    <AuthorizationProvider privilegesEndpoint={`${API_BASE_PATH}privileges`}>
      <I18nContext>
        <AppContextProvider value={appDependencies}>{children}</AppContextProvider>
      </I18nContext>
    </AuthorizationProvider>
  );
};
