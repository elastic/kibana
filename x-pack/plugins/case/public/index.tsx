/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from 'kibana/public';
import React from 'react';
import { CaseUiPlugin } from './plugin';

export const TestComponent = () => <div>{'Hello from cases plugin!'}</div>;

export function plugin(initializerContext: PluginInitializerContext) {
  return new CaseUiPlugin(initializerContext);
}

export { CaseUiPlugin };
export * from './plugin';
