/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { CoreStart } from '@kbn/core/public';
import type { GetStartedComponentProps, GetStartedComponent } from './types';
import { GetStarted } from './get_started';
import { KibanaServicesProvider } from '../../services';
import { ServerlessSecurityPluginStartDependencies } from '../../types';

export const getSecurityGetStartedComponent = (
  core: CoreStart,
  pluginsStart: ServerlessSecurityPluginStartDependencies
): GetStartedComponent => {
  return (_props?: GetStartedComponentProps) => (
    <KibanaServicesProvider core={core} pluginsStart={pluginsStart}>
      <GetStarted />
    </KibanaServicesProvider>
  );
};
