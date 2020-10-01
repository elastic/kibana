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

import { Detections } from './detections';
import { Cases } from './cases';
import { Hosts } from './hosts';
import { Network } from './network';
import { Overview } from './overview';
import { Timelines } from './timelines';
import { Management } from './management';

import { createStore, createInitialState } from './common/store';

const subPluginClasses: SubPluginClasses = {
  Detections,
  Cases,
  Hosts,
  Network,
  Overview,
  Timelines,
  Management,
};

export { renderApp, composeLibs, subPluginClasses, createStore, createInitialState };
