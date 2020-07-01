/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UrlDrilldownTriggerDefinition } from './url_drilldown_trigger_registry';
import { UrlDrilldownContextProvider } from './url_drilldown_context_provider_registry';

export interface UrlDrilldownConfig {
  url: string;
  openInNewTab: boolean;
}

export interface UrlDrilldownScope<
  ContextScope extends object = object,
  EventScope extends object = object
> extends UrlDrilldownGlobalScope {
  context?: ContextScope;
  event?: EventScope;
}

export interface UrlDrilldownGlobalScope {
  kibanaUrl: string;
}

export interface UrlDrilldownService {
  registerTrigger(urlDrilldownTrigger: UrlDrilldownTriggerDefinition): void;
  registerContextProvider<InjectedContext extends object>(
    urlDrilldownContextProvider: UrlDrilldownContextProvider<InjectedContext>
  ): void;
}
