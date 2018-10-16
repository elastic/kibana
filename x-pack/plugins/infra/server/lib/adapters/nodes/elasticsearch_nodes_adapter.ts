/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraBackendFrameworkAdapter, InfraFrameworkRequest } from '../framework';
import {
  InfraBucket,
  InfraNodeRequestOptions,
  InfraNodesAdapter,
  InfraNodesAggregations,
} from './adapter_types';

import { InfraNode } from '../../../../common/graphql/types';
import { calculateCardinalityOfNodeField } from './lib/calculate_cardinality';
import { createPartitionBodies } from './lib/create_partition_bodies';
import { processNodes } from './lib/process_nodes';

export class ElasticsearchNodesAdapter implements InfraNodesAdapter {
  private framework: InfraBackendFrameworkAdapter;
  constructor(framework: InfraBackendFrameworkAdapter) {
    this.framework = framework;
  }

  public async getNodes(
    req: InfraFrameworkRequest,
    options: InfraNodeRequestOptions
  ): Promise<InfraNode[]> {
    const search = <Aggregation>(searchOptions: object) =>
      this.framework.callWithRequest<{}, Aggregation>(req, 'search', searchOptions);
    const msearch = <Aggregation>(msearchOptions: object) =>
      this.framework.callWithRequest<{}, Aggregation>(req, 'msearch', msearchOptions);

    const nodeField = options.sourceConfiguration.fields[options.nodeType];
    const totalNodes = await calculateCardinalityOfNodeField(search, nodeField, options);

    if (totalNodes === 0) {
      return [];
    }

    const body = createPartitionBodies(totalNodes, options.nodeType, nodeField, options);

    const response = await msearch<InfraNodesAggregations>({
      body,
    });

    if (response && response.responses) {
      const nodeBuckets: InfraBucket[] = response.responses.reduce(
        (current: InfraBucket[], resp) => {
          if (!resp.aggregations) {
            return current;
          }
          const buckets = resp.aggregations.waffle.nodes.buckets;
          return current.concat(buckets);
        },
        []
      );
      return processNodes(options, nodeBuckets);
    }

    return [];
  }
}
