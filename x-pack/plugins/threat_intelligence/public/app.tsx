/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import React, { VFC } from 'react';
import { IndicatorsPage } from './modules/indicators/indicators_page';
import { KibanaContextProvider } from './hooks/use_kibana';

export interface AppProps {
  services: CoreStart;
}

export const App: VFC<AppProps> = ({ services }) => {
  return (
    <KibanaContextProvider services={services}>
      <IndicatorsPage />
    </KibanaContextProvider>
  );
};
