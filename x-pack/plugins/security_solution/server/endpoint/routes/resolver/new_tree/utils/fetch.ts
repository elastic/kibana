/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'kibana/server';
import { DescendantsQuery } from '../queries/descendants';
import { Schema } from '../queries/aggregation_utils';

/**
 * The query parameters passed in from the request. These define the limits for the ES requests for retrieving the
 * resolver tree.
 */
export interface TreeOptions {
  levels?: {
    ancestors: number;
    descendants: number;
  };
  descendants: number;
  ancestors: number;
  timerange: {
    from: string;
    to: string;
  };
  schema: Schema;
  // TODO figure out if we should use any or restrict the request to only string and number
  nodes: Array<string | number>;
  indexPatterns: string[];
}

/**
 * Handles retrieving nodes of a resolver tree.
 */
export class Fetcher {
  constructor(private readonly client: IScopedClusterClient) {}

  /**
   * This method retrieves the resolver tree starting from the `id` during construction of the class.
   *
   * @param options the options for retrieving the structure of the tree.
   */
  public async tree(options: TreeOptions) {
    const query = new DescendantsQuery({
      schema: options.schema,
      indexPatterns: options.indexPatterns,
      timerange: options.timerange,
      size: options.descendants,
    });

    return query.search(this.client, options.nodes);
  }
}
