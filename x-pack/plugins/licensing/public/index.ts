/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'src/core/public';
import { Plugin } from './plugin';

export * from '../common/types';
export * from '../common/constants';
export const plugin = (context: PluginInitializerContext) => new Plugin(context);
