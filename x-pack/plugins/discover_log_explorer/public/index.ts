/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
<<<<<<< HEAD

import './index.scss';
=======
>>>>>>> 389778b70c6 (feat(observability-logs): try discover customization)

import { DiscoverLogExplorerPlugin } from './plugin';

export function plugin() {
  return new DiscoverLogExplorerPlugin();
}

export type { DiscoverLogExplorerPluginSetup, DiscoverLogExplorerPluginStart } from './types';
