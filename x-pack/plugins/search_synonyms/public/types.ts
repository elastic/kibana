/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from '../common/types';

export interface AppPluginStartDependencies {
  history: AppMountParameters['history'];
  console?: ConsolePluginStart;
}
import { AppMountParameters } from '@kbn/core/public';
import type { ConsolePluginStart } from '@kbn/console-plugin/public';
