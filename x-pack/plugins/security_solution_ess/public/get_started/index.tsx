/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import type { CoreStart } from '@kbn/core/public';
import { KibanaServicesProvider } from '../services';
import type { SecuritySolutionEssPluginStartDeps } from '../types';
import { GetStarted } from './lazy';

export const getSecurityGetStartedComponent = (
  core: CoreStart,
  pluginsStart: SecuritySolutionEssPluginStartDeps
) =>
  function GetStartedComponent() {
    return (
      <KibanaServicesProvider core={core} pluginsStart={pluginsStart}>
        <GetStarted />
      </KibanaServicesProvider>
    );
  };
