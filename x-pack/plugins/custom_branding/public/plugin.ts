/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { PLUGIN } from '../common/constants';

export class CustomBrandingPlugin implements Plugin {
  constructor(context: PluginInitializerContext) {}

  setup({ getStartServices, notifications, http, uiSettings }: CoreSetup) {}

  start(core: CoreStart) {
    const { chrome } = core;
    chrome.registerCustomBrandingPlugin(PLUGIN.ID);
    return {};
  }
}
