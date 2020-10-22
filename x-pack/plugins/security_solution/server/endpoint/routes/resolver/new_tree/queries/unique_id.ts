/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ApiResponse } from '@elastic/elasticsearch';
import { SearchResponse } from 'elasticsearch';

import { JsonObject, JsonValue } from '../../../../../../../../../src/plugins/kibana_utils/common';

interface IDParts {
  ancestry?: string;
  connections: Array<{ id: string; parentID: string }>;
}

export class UniqueID {
  public readonly sourceFilter: string[];
  private readonly parts: Set<string>;
  private readonly idToParent: Map<string, string>;
  constructor(public readonly idParts: IDParts) {
    this.sourceFilter = this.createSourceFilter();
    this.parts = this.createMapParts();
    this.idToParent = this.createIDToParent();
  }

  private createMapParts(): Set<string> {
    const parts = new Set<string>();
    if (this.idParts.ancestry) {
      parts.add(this.idParts.ancestry);
    }

    for (const connection of this.idParts.connections) {
      parts.add(connection.id);
      parts.add(connection.parentID);
    }
    return parts;
  }

  private createIDToParent(): Map<string, string> {
    const idToParent = new Map<string, string>();
    for (const connection of this.idParts.connections) {
      idToParent.set(connection.id, connection.parentID);
    }
    return idToParent;
  }

  private createSourceFilter(): string[] {
    const filter = this.idParts.connections.reduce((sourceFilterAcc: string[], connection) => {
      sourceFilterAcc.push(connection.id, connection.parentID);
      return sourceFilterAcc;
    }, []);

    if (this.idParts.ancestry) {
      filter.push(this.idParts.ancestry);
    }
    return filter;
  }

  /**
   * Given a spec like:
   * [
   *    {
   *      id: "process.pid",
   *      parentID: "process.ppid"
   *    },
   *    {
   *      id: "host.id",
   *      parentID: "host.id"
   *    }
   * ]
   *
   * This function transforms this:
   * nodes
   * [
   *    {
   *      "process.pid": "100",
   *      "host.id": "my-awesome-id",
   *    },
   *    {
   *      "process.pid": "5",
   *      "host.id": "other-id"
   *    }
   * ]
   *
   * to this:
   * bool: {
   *  should: [
   *    {
   *      filter: [
   *        {
   *          term: { "process.ppid": "100"}
   *        },
   *        {
   *          term: { "host.id": my-awesome-id}
   *        }
   *      ]
   *    },
   *    {
   *      filter: [
   *        {
   *          term: { "process.ppid": 5},
   *        },
   *        {
   *          term: {"host.id": "other-id"}
   *        }
   *      ]
   *    }
   *  ]
   * }
   */
  public buildDescendantsQueryFilters(nodes: Array<Map<string, string>>) {
    const validateKeys = (keys: IterableIterator<string>) => {
      for (const key of keys) {
        if (!this.parts.has(key)) {
          throw new Error(`node key: ${key} was not found in id definition`);
        }
      }
    };

    // TODO make this cleaner
    const filter = nodes.map((node) => {
      validateKeys(node.keys());
      const filterArray = [];
      for (const [key, value] of node.entries()) {
        const parentKey = this.idToParent.get(key);
        if (parentKey) {
          filterArray.push({
            term: { [parentKey]: value },
          });
        }
      }
      return {
        bool: {
          filter: filterArray,
        },
      };
    });

    return {
      bool: {
        should: [...filter],
      },
    };
  }

  public buildEmptyRestraints(): JsonObject[] {
    const filter = [];

    for (const connection of this.idParts.connections) {
      filter.push(
        {
          exists: {
            field: connection.id,
          },
        },
        {
          exists: {
            field: connection.parentID,
          },
        }
      );
    }
    return filter;
  }

  private buildFinalAgg(nestedAggs: any) {
    nestedAggs.aggs = {
      singleEvent: {
        top_hits: {
          // TODO figure out if we can use doc_values
          _source: this.sourceFilter,
          size: 1,
          // TODO there might a use case to make the order configurable
          sort: [{ '@timestamp': { order: 'asc' } }],
        },
      },
    };
  }

  private buildSingleAgg(nestedAggs: any, field: string, size: number) {
    nestedAggs.aggs = {
      [field]: {
        terms: {
          field,
          size,
        },
      },
    };
    return nestedAggs.aggs[field];
  }

  public buildAggregations(size: number): JsonValue {
    const accumulatedAggs: any = { aggs: {} };
    let current: JsonObject = accumulatedAggs;
    for (const connection of this.idParts.connections) {
      current = this.buildSingleAgg(current, connection.id, size);
    }

    this.buildFinalAgg(current);
    return accumulatedAggs.aggs;
  }

  private nodesFromAggsHelper(aggsResult: any, spec: Array<{ id: string; parentID: string }>) {
    const nextAggsLevel = (aggs: any, field: string) => {
      return aggs[field].buckets;
    };

    console.log('aggsResult', JSON.stringify(aggsResult, null, 2));
    console.log('spec', spec);
    if (spec && spec.length > 0 && aggsResult[spec[0].id].buckets) {
      const connection = spec.shift();
      if (!connection) {
        throw new Error('this should never happen');
      }
      return this.nodesFromAggsHelper(nextAggsLevel(aggsResult, connection.id), spec);
    }

    console.log('node recursion', JSON.stringify(aggsResult, null, 2));
    const results = [];
    for (const bucket of aggsResult) {
      results.push(...bucket.singleEvent.hits.hits.map((hit) => hit._source));
    }
    return results;
  }

  /**
   * Need to test, I think this will work.
   * @param buckets
   * @param spec
   */
  private nodesFromAggsHelper2(buckets: any, spec: Array<{ id: string; parentID: string }>) {
    if (buckets && spec && spec.length) {
      const edge = spec.shift();
      if (!edge) {
        throw new Error('this should neveer happen');
      }

      return buckets.reduce((results, bucket) => {
        results.push(...this.nodesFromAggsHelper2(bucket[edge.id].buckets, spec));
        return results;
      }, []);
    }

    return buckets.reduce((results, bucket) => {
      results.push(...bucket.singleEvent.hits.hits.map((hit) => hit._source));
      return results;
    });
  }

  public getNodesFromAggs(response: ApiResponse<SearchResponse<unknown>>) {
    const spec = [...this.idParts.connections];
    const firstField = spec[0];
    spec.shift();
    return this.nodesFromAggsHelper(response.body.aggregations[firstField.id], spec);
  }
}
