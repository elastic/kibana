/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { CoreStart } from '@kbn/core/public';
import { ServerlessSecurityPluginStartDependencies } from '../../types';
import { SecuritySideNavigation } from './side_navigation';
import { KibanaServicesProvider } from '../../services';

export const getSecuritySideNavigation = (
  core: CoreStart,
  pluginsStart: ServerlessSecurityPluginStartDependencies
) => {
  return (
    <KibanaServicesProvider core={core} pluginsStart={pluginsStart}>
      <SecuritySideNavigation />
    </KibanaServicesProvider>
  );
};
