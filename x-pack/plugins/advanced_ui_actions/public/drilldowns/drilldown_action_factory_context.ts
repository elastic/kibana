/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Context object used when creating a drilldown.
 */
export interface DrilldownActionFactoryContext<T> {
  /**
   * Context provided to the drilldown factory by the place where the UI is
   * rendered. For example, for the "dashboard" place, this context contains
   * the ID of the current dashboard, which could be used for filtering it out
   * of the list.
   */
  placeContext: T;

  /**
   * List of triggers that user selected in the UI.
   */
  triggers: string[];
}
