/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
