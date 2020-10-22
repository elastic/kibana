/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { JsonObject } from '../../../../../../../../../src/plugins/kibana_utils/common';

interface IDParts {
  ancestry?: string;
  connections: Array<{ id: string; parentID: string }>;
}

export class UniqueID {
  public readonly sourceFilter: string[];
  private readonly parts: Set<string>;
  constructor(public readonly idParts: IDParts, public readonly nodes: Array<Map<string, string>>) {
    this.sourceFilter = this.createSourceFilter();
    this.parts = this.createMapParts();
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
   * Transforms this:
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
   *          term: { "process.pid": "100"}
   *        },
   *        {
   *          term: { "host.id": my-awesome-id}
   *        }
   *      ]
   *    },
   *    {
   *      filter: [
   *        {
   *          term: { "process.pid": 5},
   *        },
   *        {
   *          term: {"host.id": "other-id"}
   *        }
   *      ]
   *    }
   *  ]
   * }
   */
  public buildQueryFilters(nodes: Array<Map<string, string>>) {
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
        filterArray.push({
          term: { [key]: value },
        });
      }
      return { filter: filterArray };
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
          bool: {
            must_not: {
              term: { [connection.id]: '' },
            },
          },
        },
        {
          exists: {
            field: connection.parentID,
          },
        },
        {
          bool: {
            must_not: {
              term: { [connection.parentID]: '' },
            },
          },
        }
      );
    }
    return filter;
  }

  private buildFinalAgg() {
    return {
      aggs: {
        singleEvent: {
          top_hits: {
            // TODO figure out if we can use doc_values
            _source: this.sourceFilter,
            size: 1,
            // TODO there might a use case to the order configurable
            sort: [{ '@timestamp': { order: 'asc' } }],
          },
        },
      },
    };
  }

  private buildSingleAgg(field: string, size: number) {
    return {
      aggs: {
        [field]: {
          terms: {
            field,
            size,
          },
        },
      },
    };
  }

  private buildAggsHelper(aggs: JsonObject) {}

  public buildAggregations(): JsonObject {
    const aggs = [];

    for (const connection of this.idParts.connections) {
    }
  }
}
