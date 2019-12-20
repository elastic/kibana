/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializer } from 'src/core/public';
import { SecurityPlugin, SecurityPluginSetup, SecurityPluginStart } from './plugin';
export { SessionInfo } from './types';
export { AuthenticatedUser } from '../common/model/authenticated_user';

export const plugin: PluginInitializer<SecurityPluginSetup, SecurityPluginStart> = () =>
  new SecurityPlugin();
