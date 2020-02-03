/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PluginInitializer } from 'kibana/public';
import {
  DataPublicPlugin as Plugin,
  DataPublicSetup,
  DataPublicStart,
  DataPublicSetupDependencies,
  DataPublicStartDependencies,
} from './plugin';

export const plugin: PluginInitializer<
  DataPublicSetup,
  DataPublicStart,
  DataPublicSetupDependencies,
  DataPublicStartDependencies
> = () => new Plugin();
