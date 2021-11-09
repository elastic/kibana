/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext } from 'react';
import { ConfigSchema } from '../..';
import { CoreStart } from '../../../../../../src/core/public';
import { ApmPluginSetupDeps, ApmPluginStartDeps } from '../../plugin';

export interface MockApmAppContextValue {
  config: ConfigSchema;
  core: CoreStart;
  pluginsSetup: ApmPluginSetupDeps;
  pluginsStart: ApmPluginStartDeps;
}

export const MockApmAppContext = createContext<MockApmAppContextValue>(
  {} as MockApmAppContextValue
);

/**
 * A mock provider for APM contexts which includes mocks for:
 *
 * - ApmPluginContext
 * - KibanaConfigContext
 * - KibanaContext
 *
 * Provided values are deep-merged with mocked defaults.
 */
export function MockApmAppContextProvider(value: MockApmAppContextValue) {
  return <MockApmAppContext.Provider value={value} />;
}
