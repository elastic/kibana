/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
} from '../../../../src/core/public';

export type Setup = void;
export type Start = void;

export class NewsfeedPublicPlugin implements Plugin<Setup, Start> {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup): Setup {}

  public start(core: CoreStart): Start {}
}
