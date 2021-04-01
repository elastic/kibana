/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nStart } from 'src/core/public';
import { AppContextProvider, ContextValue } from './app_context';
import { PageContent } from './components/page_content';

export interface AppDependencies extends ContextValue {
  i18n: I18nStart;
}

export const RootComponent = ({ i18n, ...contextValue }: AppDependencies) => {
  return (
    <i18n.Context>
      <AppContextProvider value={contextValue}>
        <PageContent />
      </AppContextProvider>
    </i18n.Context>
  );
};
