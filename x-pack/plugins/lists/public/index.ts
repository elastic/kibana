/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: https://github.com/elastic/kibana/issues/110903
/* eslint-disable @kbn/eslint/no_export_all */

export * from './shared_exports';

import type { PluginInitializerContext } from '../../../../src/core/public';

import { Plugin } from './plugin';
import type { PluginSetup, PluginStart } from './types';

export const plugin = (context: PluginInitializerContext): Plugin => new Plugin(context);

export type { Plugin, PluginSetup, PluginStart };
