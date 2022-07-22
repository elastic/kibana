/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { IndicatorsPage } from './modules/indicators/indicators_page';
import { KibanaContextProvider, useKibana } from './hooks/use_kibana';

export const App = () => {
  const services = useKibana().services;

  return (
    <KibanaContextProvider services={services}>
      <IndicatorsPage />
    </KibanaContextProvider>
  );
};
