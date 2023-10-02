/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  KibanaContextProvider,
  useKibana as useKibanaReact,
} from '@kbn/kibana-react-plugin/public';
import { NavigationProvider } from '@kbn/security-solution-navigation';
import type { Services } from './types';

export const ServicesProvider: React.FC<{
  services: Services;
}> = ({ services, children }) => {
  return (
    <KibanaContextProvider services={services}>
      <NavigationProvider core={services}>{children}</NavigationProvider>
    </KibanaContextProvider>
  );
};

export const withServicesProvider = <T extends object>(
  Component: React.ComponentType<T>,
  services: Services
) => {
  return function WithServicesProvider(props: T) {
    return (
      <ServicesProvider services={services}>
        <Component {...props} />
      </ServicesProvider>
    );
  };
};

export const useKibana = () => useKibanaReact<Services>();
