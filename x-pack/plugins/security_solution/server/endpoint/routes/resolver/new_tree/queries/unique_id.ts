/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { JsonObject, JsonValue } from '../../../../../../../../../src/plugins/kibana_utils/common';

export interface EdgeDefinition {
  id: string;
  parentID: string;
}

export interface Schema {
  ancestry?: string;
  edges: EdgeDefinition[];
}

export class UniqueID {
  public readonly sourceFilter: string[];
  private readonly parts: Set<string>;
  private readonly idToParent: Map<string, string>;
  constructor(public readonly idSchema: Schema) {
    if (idSchema.edges.length <= 0) {
      throw new Error('received empty edges schema');
    }
    const { schemaParts, idToParent, sourceFilter } = UniqueID.setupFields(idSchema);
    this.sourceFilter = sourceFilter;
    this.parts = schemaParts;
    this.idToParent = idToParent;
  }

  private static setupFields(schema: Schema) {
    const schemaParts = new Set<string>();
    const idToParent = new Map<string, string>();
    const sourceFilter: string[] = ['@timestamp'];

    if (schema.ancestry) {
      schemaParts.add(schema.ancestry);
      sourceFilter.push(schema.ancestry);
    }

    for (const edge of schema.edges) {
      schemaParts.add(edge.id);
      schemaParts.add(edge.parentID);
      idToParent.set(edge.id, edge.parentID);
    }

    return { schemaParts, idToParent, sourceFilter };
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
   *  [
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
   */
  public buildDescendantsQueryFilters(nodes: Array<Map<string, string>>) {
    const validateKeys = (keys: IterableIterator<string>) => {
      for (const key of keys) {
        if (!this.parts.has(key)) {
          throw new Error(`node key: ${key} was not found in id definition`);
        }
      }
    };

    // iterate over all the nodes and build a bunch of OR clauses (find node1 or node2 etc)
    // to build each OR clause, we need to construct a bunch of AND clauses to restrict the
    // search to the fields included in the edge's schema
    // so the resulting clause would be:
    // (node1.fieldA == valueA AND node1.fieldB == valueB) OR (node2.fieldE == valueE AND node2.fieldF == valueF) etc
    const filters = nodes.map((node) => {
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

    return filters;
  }

  public buildConstraints(): JsonObject[] {
    const filter = [];

    for (const connection of this.idSchema.edges) {
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
    for (const connection of this.idSchema.edges) {
      current = this.buildSingleAgg(current, connection.id, size);
    }

    this.buildFinalAgg(current);
    return accumulatedAggs.aggs;
  }

  /**
   * This is an example response when the edges are defined as:
   * {
   *    id: process.entity_id
   *    parentID: process.parent.entity_id
   * },
   * {
   *    id: host.id
   *    parentID: host.id
   * },
   * {
   *    id: host.name
   *    parentID: host.name
   * }
   *
  "body": {
    "took": 3,
    "timed_out": false,
    "_shards": {
      "total": 3,
      "successful": 3,
      "skipped": 0,
      "failed": 0
    },
    "hits": {
      "total": {
        "value": 2,
        "relation": "eq"
      },
      "max_score": null,
      "hits": []
    },
    "aggregations": {
      "process.entity_id": {
        "doc_count_error_upper_bound": 0,
        "sum_other_doc_count": 0,
        "buckets": [
          {
            "key": "xcv7o96glx",
            "doc_count": 1,
            "host.id": {
              "doc_count_error_upper_bound": 0,
              "sum_other_doc_count": 0,
              "buckets": [
                {
                  "key": "b87eb510-3555-422c-b81d-b25e71ef09aa",
                  "doc_count": 1,
                  "host.name": {
                    "doc_count_error_upper_bound": 0,
                    "sum_other_doc_count": 0,
                    "buckets": [
                      {
                        "key": "Host-4dbzugdlqd",
                        "doc_count": 1,
                        "singleEvent": {
                          "hits": {
                            "total": {
                              "value": 1,
                              "relation": "eq"
                            },
                            "max_score": null,
                            "hits": [
                              {
                                "_index": ".ds-logs-endpoint.events.process-default-000001",
                                "_id": "bUzZUXUBfW9lQwgL4IZi",
                                "_score": null,
                                "_source": {
                                  "process": {
                                    "parent": {
                                      "entity_id": "9tw2j9fryf"
                                    },
                                    "entity_id": "xcv7o96glx"
                                  },
                                  "host": {
                                    "name": "Host-4dbzugdlqd",
                                    "id": "b87eb510-3555-422c-b81d-b25e71ef09aa"
                                  }
                                },
                                "sort": [
                                  1603396040806
                                ]
                              }
                            ]
                          }
                        }
                      }
                    ]
                  }
                }
              ]
            }
          },
          {
            "key": "zovg1ej2j3",
            "doc_count": 1,
            "host.id": {
              "doc_count_error_upper_bound": 0,
              "sum_other_doc_count": 0,
              "buckets": [
                {
                  "key": "b87eb510-3555-422c-b81d-b25e71ef09aa",
                  "doc_count": 1,
                  "host.name": {
                    "doc_count_error_upper_bound": 0,
                    "sum_other_doc_count": 0,
                    "buckets": [
                      {
                        "key": "Host-4dbzugdlqd",
                        "doc_count": 1,
                        "singleEvent": {
                          "hits": {
                            "total": {
                              "value": 1,
                              "relation": "eq"
                            },
                            "max_score": null,
                            "hits": [
                              {
                                "_index": ".ds-logs-endpoint.events.process-default-000001",
                                "_id": "e0zZUXUBfW9lQwgL4IZi",
                                "_score": null,
                                "_source": {
                                  "process": {
                                    "parent": {
                                      "entity_id": "9tw2j9fryf"
                                    },
                                    "entity_id": "zovg1ej2j3"
                                  },
                                  "host": {
                                    "name": "Host-4dbzugdlqd",
                                    "id": "b87eb510-3555-422c-b81d-b25e71ef09aa"
                                  }
                                },
                                "sort": [
                                  1603396047806
                                ]
                              }
                            ]
                          }
                        }
                      }
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    }
  }
    The returned nodes when calling getNodesFromAggs are:
    [
      {
          "process": {
              "parent": {
                  "entity_id": "9tw2j9fryf"
              },
              "entity_id": "xcv7o96glx"
          },
          "host": {
              "name": "Host-4dbzugdlqd",
              "id": "b87eb510-3555-422c-b81d-b25e71ef09aa"
          }
      },
      {
          "process": {
              "parent": {
                  "entity_id": "9tw2j9fryf"
              },
              "entity_id": "zovg1ej2j3"
          },
          "host": {
              "name": "Host-4dbzugdlqd",
              "id": "b87eb510-3555-422c-b81d-b25e71ef09aa"
          }
      }
    ]
   */

  /**
   * Recursively traverse the aggregation results to accumulate the top_hits entries within the inner most
   * elements.
   *
   * @param buckets an array of unique elements corresponding to part of an edge schema.
   * @param edgesSchema an array of schema information describing how edges are defined in the graph
   */
  private traverseBuckets(aggregation: any, edgesSchema: EdgeDefinition[]) {
    if (!aggregation?.buckets) {
      return [];
    }

    const buckets = aggregation.buckets;

    if (edgesSchema && edgesSchema.length > 0) {
      const edge = edgesSchema[0];

      return buckets.reduce((results, bucket) => {
        results.push(...this.traverseBuckets(bucket[edge.id], edgesSchema.slice(1)));
        return results;
      }, []);
    }

    return buckets.reduce((results, bucket) => {
      results.push(...bucket.singleEvent.hits.hits.map((hit) => hit._source));
      return results;
    }, []);
  }

  public getNodesFromAggs(aggregations: any) {
    const firstField = this.idSchema.edges[0];
    return this.traverseBuckets(aggregations[firstField.id], this.idSchema.edges.slice(1));
  }
}
