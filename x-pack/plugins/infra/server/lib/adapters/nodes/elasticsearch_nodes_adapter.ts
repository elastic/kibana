/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  InfraBackendFrameworkAdapter,
  InfraBucket,
  InfraFrameworkRequest,
  InfraNodeRequestOptions,
  InfraNodesAdapter,
  InfraNodesAggregations,
} from '../../infra_types';

import { DOMAIN_TO_FIELD } from '../../../../common/constants';
import { InfraResponse } from '../../../../common/types';
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
  ): Promise<InfraResponse> {
    const search = <Aggregation>(searchOptions: object) =>
      this.framework.callWithRequest<{}, Aggregation>(
        req,
        'search',
        searchOptions
      );
    const msearch = <Aggregation>(msearchOptions: object) =>
      this.framework.callWithRequest<{}, Aggregation>(
        req,
        'msearch',
        msearchOptions
      );

    const infraResponse: InfraResponse = {};

    const totalNodes = await calculateCardinalityOfNodeField(
      search,
      DOMAIN_TO_FIELD[options.nodeType],
      options
    );

    if (totalNodes === 0) {
      return infraResponse;
    }

    const body = createPartitionBodies(
      totalNodes,
      DOMAIN_TO_FIELD[options.nodeType],
      options
    );

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

    return infraResponse;
  }
}
