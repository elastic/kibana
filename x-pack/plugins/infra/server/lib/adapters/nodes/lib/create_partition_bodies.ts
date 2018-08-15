/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { times } from 'lodash';

import {
  InfraESMSearchBody,
  InfraNodeRequestOptions,
  InfraProcesorRequestOptions,
} from '../adapter_types';
import { NODE_REQUEST_PARTITION_SIZE } from '../constants';
import { createNodeRequestBody } from './create_node_request_body';

export function createPartitionBodies(
  totalNodes: number,
  nodeField: string,
  nodeOptions: InfraNodeRequestOptions
): InfraESMSearchBody[] {
  const { sourceConfiguration }: InfraNodeRequestOptions = nodeOptions;
  const bodies: InfraESMSearchBody[] = [];
  const numberOfPartitions: number = Math.ceil(totalNodes / NODE_REQUEST_PARTITION_SIZE);
  times(
    numberOfPartitions,
    (partitionId: number): void => {
      const processorOptions: InfraProcesorRequestOptions = {
        nodeField,
        nodeOptions,
        numberOfPartitions,
        partitionId,
      };
      bodies.push({
        index: [sourceConfiguration.logAlias, sourceConfiguration.metricAlias],
      });
      bodies.push(createNodeRequestBody(processorOptions));
    }
  );
  return bodies;
}
