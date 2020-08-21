/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface UrlDrilldownConfig {
  url: { format?: 'mustache_v1'; template: string };
  openInNewTab: boolean;
}

/**
 * URL drilldown has 3 sources for variables: global, context and event variables
 1. Global - static variables like, for example, kibanaInstanceId or kibanaBaseUrl. Such variables won’t change depending on a place where url drilldown is used.
 2. Context - variables are dynamic and different depending on where drilldown is created and used. For example:
    Variables from embeddable. Like embeddableId, embeddableTitle, embeddableType, filters, query, etc…
    Variables from dashboard (if used inside dashboard app). Like dashboardId or dashboardTitle.
 3. Event - variables depend on a trigger context. These variables are dynamically extracted from the trigger context when drilldown is executed.
 */
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
