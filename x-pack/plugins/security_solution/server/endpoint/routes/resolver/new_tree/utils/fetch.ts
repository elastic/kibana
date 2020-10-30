/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import { IScopedClusterClient } from 'kibana/server';
import { DescendantsQuery } from '../queries/descendants';
import { Schema } from '../queries/aggregation_utils';

/**
 * The query parameters passed in from the request. These define the limits for the ES requests for retrieving the
 * resolver tree.
 */
export interface TreeOptions {
  levels: {
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
    // const query = new DescendantsQuery({
    //   schema: options.schema,
    //   indexPatterns: options.indexPatterns,
    //   timerange: options.timerange,
    // });

    // return query.search(this.client, options.nodes, options.descendants);

    return this.retrieveDescendants(options);
  }

  private async retrieveDescendants(options: TreeOptions) {
    const descendants = [];
    const query = new DescendantsQuery({
      schema: options.schema,
      indexPatterns: options.indexPatterns,
      timerange: options.timerange,
    });

    let nodes = options.nodes;
    let numNodesLeftToRequest = options.descendants;
    let levelsLeftToRequest = options.levels.descendants;
    while (levelsLeftToRequest > 0 && numNodesLeftToRequest) {
      const results = await query.search(this.client, nodes, numNodesLeftToRequest);
      if (results.length <= 0) {
        return descendants;
      }

      const parents = results.reduce((totalParents, result) => {
        // TODO get rid of lodash :)
        totalParents.add(_.get(result, options.schema.parent));
        return totalParents;
      }, new Set<string>()).size;

      // TODO need to use the same algorithm from children_helper.ts to determine the most distant grand children and
      // use those to query the next set of descendants, otherwise we'll get duplicates when using the ancestry array
      // TODO remove this
      nodes = results.map((node) => {
        // TODO get rid of lodash
        return _.get(node, options.schema.id);
      });

      numNodesLeftToRequest -= results.length;
      levelsLeftToRequest -= parents;
      descendants.push(...results);

      // if the ancestry array is defined then that will override levels
      if (options.schema.ancestry) {
        levelsLeftToRequest = 1;
      }
    }

    return descendants;
  }
}
