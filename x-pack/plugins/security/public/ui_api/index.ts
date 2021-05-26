/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartServicesAccessor } from 'src/core/public';

import { UserAPIClient } from '../management';
import type { PluginStartDependencies } from '../plugin';
import { getComponents } from './components';

interface GetUiApiOptions {
  getStartServices: StartServicesAccessor<PluginStartDependencies>;
}

export const getUiApi = ({ getStartServices }: GetUiApiOptions) => {
  const components = getComponents({ getStartServices });

  return {
    components,
    UserAPIClient,
  };
};
