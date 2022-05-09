/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import {
  firstNonNullValue,
  values,
} from '../../../../../../common/endpoint/models/ecs_safety_helpers';
import {
  ECSField,
  ResolverNode,
  FieldsObject,
  ResolverSchema,
} from '../../../../../../common/endpoint/types';
import { DescendantsQuery } from '../queries/descendants';
import { NodeID } from '.';
import { LifecycleQuery } from '../queries/lifecycle';
import { StatsQuery } from '../queries/stats';

/**
 * The query parameters passed in from the request. These define the limits for the ES requests for retrieving the
 * resolver tree.
 */
export interface TreeOptions {
  descendantLevels: number;
  descendants: number;
  ancestors: number;
  timeRange: {
    from: string;
    to: string;
  };
  schema: ResolverSchema;
  nodes: NodeID[];
  indexPatterns: string[];
}

/**
 * Handles retrieving nodes of a resolver tree.
 */
export class Fetcher {
  constructor(private readonly client: IScopedClusterClient) {}

  /**
   * This method retrieves the ancestors and descendants of a resolver tree.
   *
   * @param options the options for retrieving the structure of the tree.
   */
  public async tree(options: TreeOptions): Promise<ResolverNode[]> {
    const treeParts = await Promise.all([
      this.retrieveAncestors(options),
      this.retrieveDescendants(options),
    ]);

    const tree = treeParts.reduce((results, partArray) => {
      results.push(...partArray);
      return results;
    }, []);

    return this.formatResponse(tree, options);
  }

  private async formatResponse(
    treeNodes: FieldsObject[],
    options: TreeOptions
  ): Promise<ResolverNode[]> {
    const statsIDs: NodeID[] = [];
    for (const node of treeNodes) {
      const id = getIDField(node, options.schema);
      if (id) {
        statsIDs.push(id);
      }
    }

    const query = new StatsQuery({
      indexPatterns: options.indexPatterns,
      schema: options.schema,
      timeRange: options.timeRange,
    });

    const eventStats = await query.search(this.client, statsIDs);
    const statsNodes: ResolverNode[] = [];
    for (const node of treeNodes) {
      const id = getIDField(node, options.schema);
      const parent = getParentField(node, options.schema);
      const name = getNameField(node, options.schema);

      // at this point id should never be undefined, it should be enforced by the Elasticsearch query
      // but let's check anyway
      if (id !== undefined) {
        statsNodes.push({
          id,
          parent,
          name,
          data: node,
          stats: eventStats[id] ?? { total: 0, byCategory: {} },
        });
      }
    }
    return statsNodes;
  }

  private static getNextAncestorsToFind(
    results: FieldsObject[],
    schema: ResolverSchema,
    levelsLeft: number
  ): NodeID[] {
    const nodesByID = results.reduce((accMap: Map<NodeID, FieldsObject>, result: FieldsObject) => {
      const id = getIDField(result, schema);
      if (id) {
        accMap.set(id, result);
      }
      return accMap;
    }, new Map());

    const nodes: NodeID[] = [];
    // Find all the nodes that don't have their parent in the result set, we will use these
    // nodes to find the additional ancestry
    for (const result of results) {
      const parent = getParentField(result, schema);
      if (parent) {
        const parentNode = nodesByID.get(parent);
        if (!parentNode) {
          // it's ok if the nodes array is larger than the levelsLeft because the query
          // will have the size set to the levelsLeft which will restrict the number of results
          nodes.push(...getAncestryAsArray(result, schema).slice(0, levelsLeft));
        }
      }
    }
    return nodes;
  }

  private async retrieveAncestors(options: TreeOptions): Promise<FieldsObject[]> {
    const ancestors: FieldsObject[] = [];
    const query = new LifecycleQuery({
      schema: options.schema,
      indexPatterns: options.indexPatterns,
      timeRange: options.timeRange,
    });

    let nodes = options.nodes;
    let numLevelsLeft = options.ancestors;

    while (numLevelsLeft > 0) {
      const results: FieldsObject[] = await query.search(this.client, nodes);
      if (results.length <= 0) {
        return ancestors;
      }

      /**
       * This array (this.ancestry.ancestors) is the accumulated ancestors of the node of interest. This array is different
       * from the ancestry array of a specific document. The order of this array is going to be weird, it will look like this
       * [most distant ancestor...closer ancestor, next recursive call most distant ancestor...closer ancestor]
       *
       * Here is an example of why this happens
       * Consider the following tree:
       * A -> B -> C -> D -> E -> Origin
       * Where A was spawn before B, which was before C, etc
       *
       * Let's assume the ancestry array limit is 2 so Origin's array would be: [E, D]
       * E's ancestry array would be: [D, C] etc
       *
       * If a request comes in to retrieve all the ancestors in this tree, the accumulate results will be:
       * [D, E, B, C, A]
       *
       * The first iteration would retrieve D and E in that order because they are sorted in ascending order by timestamp.
       * The next iteration would get the ancestors of D (since that's the most distant ancestor from Origin) which are
       * [B, C]
       * The next iteration would get the ancestors of B which is A
       * Hence: [D, E, B, C, A]
       */
      ancestors.push(...results);
      numLevelsLeft -= results.length;
      nodes = Fetcher.getNextAncestorsToFind(results, options.schema, numLevelsLeft);
    }
    return ancestors;
  }

  private async retrieveDescendants(options: TreeOptions): Promise<FieldsObject[]> {
    const descendants: FieldsObject[] = [];
    const query = new DescendantsQuery({
      schema: options.schema,
      indexPatterns: options.indexPatterns,
      timeRange: options.timeRange,
    });

    let nodes: NodeID[] = options.nodes;
    let numNodesLeftToRequest: number = options.descendants;
    let levelsLeftToRequest: number = options.descendantLevels;
    // if the ancestry was specified then ignore the levels
    while (
      numNodesLeftToRequest > 0 &&
      (options.schema.ancestry !== undefined || levelsLeftToRequest > 0)
    ) {
      const results: FieldsObject[] = await query.search(this.client, nodes, numNodesLeftToRequest);
      if (results.length <= 0) {
        return descendants;
      }

      nodes = getLeafNodes(results, nodes, options.schema);

      numNodesLeftToRequest -= results.length;
      levelsLeftToRequest -= 1;
      descendants.push(...results);
    }

    return descendants;
  }
}

/**
 * This functions finds the leaf nodes for a given response from an Elasticsearch query.
 *
 * Exporting so it can be tested.
 *
 * @param results the doc values portion of the documents returned from an Elasticsearch query
 * @param nodes an array of unique IDs that were used to find the returned documents
 * @param schema the field definitions for how nodes are represented in the resolver graph
 */
export function getLeafNodes(
  results: FieldsObject[],
  nodes: Array<string | number>,
  schema: ResolverSchema
): NodeID[] {
  let largestAncestryArray = 0;
  const nodesToQueryNext: Map<number, Set<NodeID>> = new Map();
  const queriedNodes = new Set<NodeID>(nodes);
  const isDistantGrandchild = (event: FieldsObject) => {
    const ancestry = getAncestryAsArray(event, schema);
    return ancestry.length > 0 && queriedNodes.has(ancestry[ancestry.length - 1]);
  };

  for (const result of results) {
    const ancestry = getAncestryAsArray(result, schema);
    // This is to handle the following unlikely but possible scenario:
    // if an alert was generated by the kernel process (parent process of all other processes) then
    // the direct children of that process would only have an ancestry array of [parent_kernel], a single value in the array.
    // The children of those children would have two values in their array [direct parent, parent_kernel]
    // we need to determine which nodes are the most distant grandchildren of the queriedNodes because those should
    // be used for the next query if more nodes should be retrieved. To generally determine the most distant grandchildren
    // we can use the last entry in the ancestry array because of its ordering. The problem with that is in the scenario above
    // the direct children of parent_kernel will also meet that criteria even though they are not actually the most
    // distant grandchildren. To get around that issue we'll bucket all the nodes by the size of their ancestry array
    // and then only return the nodes in the largest bucket because those should be the most distant grandchildren
    // from the queried nodes that were passed in.
    if (ancestry.length > largestAncestryArray) {
      largestAncestryArray = ancestry.length;
    }

    // a grandchild must have an array of > 0 and have it's last parent be in the set of previously queried nodes
    // this is one of the furthest descendants from the queried nodes
    if (isDistantGrandchild(result)) {
      let levelOfNodes = nodesToQueryNext.get(ancestry.length);
      if (!levelOfNodes) {
        levelOfNodes = new Set<NodeID>();
        nodesToQueryNext.set(ancestry.length, levelOfNodes);
      }
      const nodeID = getIDField(result, schema);
      if (nodeID) {
        levelOfNodes.add(nodeID);
      }
    }
  }
  const nextNodes = nodesToQueryNext.get(largestAncestryArray);

  return nextNodes !== undefined ? Array.from(nextNodes) : [];
}

/**
 * Retrieves the unique ID field from a document.
 *
 * Exposed for testing.
 * @param obj the doc value fields retrieved from a document returned by Elasticsearch
 * @param schema the schema used for identifying connections between documents
 */
export function getIDField(obj: FieldsObject, schema: ResolverSchema): NodeID | undefined {
  const id: ECSField<NodeID> = obj[schema.id];
  return firstNonNullValue(id);
}

/**
 * Retrieves the name field from a document.
 *
 * Exposed for testing.
 * @param obj the doc value fields retrieved from a document returned by Elasticsearch
 * @param schema the schema used for identifying connections between documents
 */
export function getNameField(obj: FieldsObject, schema: ResolverSchema): string | undefined {
  if (!schema.name) {
    return undefined;
  }

  const name: ECSField<string | number> = obj[schema.name];
  return String(firstNonNullValue(name));
}

/**
 * Retrieves the unique parent ID field from a document.
 *
 * Exposed for testing.
 * @param obj the doc value fields retrieved from a document returned by Elasticsearch
 * @param schema the schema used for identifying connections between documents
 */
export function getParentField(obj: FieldsObject, schema: ResolverSchema): NodeID | undefined {
  const parent: ECSField<NodeID> = obj[schema.parent];
  return firstNonNullValue(parent);
}

function getAncestryField(obj: FieldsObject, schema: ResolverSchema): NodeID[] | undefined {
  if (!schema.ancestry) {
    return undefined;
  }

  const ancestry: ECSField<NodeID> = obj[schema.ancestry];
  if (!ancestry) {
    return undefined;
  }

  return values(ancestry);
}

/**
 * Retrieves the ancestry array field if it exists. If it doesn't exist or if it is empty it reverts to
 * creating an array using the parent field. If the parent field doesn't exist, it returns
 * an empty array.
 *
 * Exposed for testing.
 * @param obj the doc value fields retrieved from a document returned by Elasticsearch
 * @param schema the schema used for identifying connections between documents
 */
export function getAncestryAsArray(obj: FieldsObject, schema: ResolverSchema): NodeID[] {
  const ancestry = getAncestryField(obj, schema);
  if (!ancestry || ancestry.length <= 0) {
    const parentField = getParentField(obj, schema);
    return parentField !== undefined ? [parentField] : [];
  }
  return ancestry;
}
