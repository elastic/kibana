/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface Options {
  /**
   * The entity_id of the selected node.
   */
  selectedEntityID?: string;
}

/**
 * Calculate the expected URL search based on options.
 */
export function urlSearch(resolverComponentInstanceID: string, options?: Options): string {
  if (!options) {
    return '';
  }
  const params = new URLSearchParams();
  if (options.selectedEntityID !== undefined) {
    params.set(`resolver-${resolverComponentInstanceID}-id`, options.selectedEntityID);
  }
  return params.toString();
}
