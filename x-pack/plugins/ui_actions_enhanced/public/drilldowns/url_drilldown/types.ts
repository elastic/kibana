/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type UrlDrilldownConfig = {
  url: { format?: 'handlebars_v1'; template: string };
  openInNewTab: boolean;
  disableEncoding?: boolean;
};

/**
 * URL drilldown has 3 sources for variables: global, context and event variables
 */
export interface UrlDrilldownScope<
  ContextScope extends object = object,
  EventScope extends object = object
> extends UrlDrilldownGlobalScope {
  /**
   * Dynamic variables that are differ depending on where drilldown is created and used,
   * For example: variables extracted from embeddable panel
   */
  context?: ContextScope;

  /**
   * Variables extracted from trigger context
   */
  event?: EventScope;
}

/**
 * Global static variables like, for example, `kibanaUrl`
 * Such variables won’t change depending on a place where url drilldown is used.
 */
export interface UrlDrilldownGlobalScope {
  kibanaUrl: string;
}
