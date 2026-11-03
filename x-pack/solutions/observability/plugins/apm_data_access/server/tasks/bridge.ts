/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTasksKibanaBridge } from '@kbn/core-plugins-server';
import type { ApmDataAccessPluginSetup } from '../types';

/**
 * The plugin's setup in Kibana, so a tasks entry that boots in the same process hands out the real
 * contract. A task pod has no `server` entry and builds its own.
 */
export const apmDataAccessBridge = createTasksKibanaBridge<ApmDataAccessPluginSetup, {}>();
