/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable Not sure why I need to disable this. Removing this shows an error about 'qs' being an extraneous dep. Ignoring that specific rule gives me an error about how that rule doesn't need to be ignored.
import qs from 'qs';
import { PluginInitializerContext } from '../../../../src/core/public';
import { Plugin } from './plugin';
import { PluginSetup, PluginStart } from './types';

// Using the library just in case we have some vulnerability detection that ignores unused deps
qs.parse('whatever');

export const plugin = (context: PluginInitializerContext): Plugin => new Plugin(context);

export { Plugin, PluginSetup, PluginStart };
