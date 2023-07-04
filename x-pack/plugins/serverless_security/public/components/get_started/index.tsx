/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { CoreStart } from '@kbn/core/public';

import type { GetStartedComponent } from './types';
import { GetStarted } from './lazy';
import { KibanaServicesProvider } from '../../services';
import { ServerlessSecurityPluginStartDependencies } from '../../types';
import { SecurityProductTypes } from '../../../common/config';

export const getSecurityGetStartedComponent = (
  core: CoreStart,
  pluginsStart: ServerlessSecurityPluginStartDependencies,
  productTypes: SecurityProductTypes
): GetStartedComponent => {
  return () => (
    <KibanaServicesProvider core={core} pluginsStart={pluginsStart}>
      <GetStarted productTypes={productTypes} />
    </KibanaServicesProvider>
  );
};
