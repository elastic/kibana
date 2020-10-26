/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * the plugin (defined in `plugin.tsx`) has many dependencies that can be loaded only when the app is being used.
 * By loading these later we can reduce the initial bundle size and allow users to delay loading these dependencies until they are needed.
 */

import { renderApp } from './app';
import { composeLibs } from './common/lib/compose/kibana_compose';

import { createStore, createInitialState } from './common/store';

export { renderApp, composeLibs, createStore, createInitialState };
