/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { times } from 'lodash';

import { InfraMetricType } from '../../../../../common/graphql/types';
import {
  InfraESMSearchBody,
  InfraNodeRequestOptions,
  InfraNodeType,
  InfraProcesorRequestOptions,
} from '../adapter_types';
import { NODE_REQUEST_PARTITION_SIZE } from '../constants';
import { createNodeRequestBody } from './create_node_request_body';

export function createPartitionBodies(
  totalNodes: number,
  nodeType: InfraNodeType,
  nodeField: string,
  nodeOptions: InfraNodeRequestOptions
): InfraESMSearchBody[] {
  const { sourceConfiguration }: InfraNodeRequestOptions = nodeOptions;
  const bodies: InfraESMSearchBody[] = [];
  const numberOfPartitions: number = Math.ceil(totalNodes / NODE_REQUEST_PARTITION_SIZE);
  const indices =
    nodeOptions.metric.type === InfraMetricType.logRate
      ? [sourceConfiguration.logAlias]
      : [sourceConfiguration.metricAlias];
  times(
    numberOfPartitions,
    (partitionId: number): void => {
      const processorOptions: InfraProcesorRequestOptions = {
        nodeType,
        nodeField,
        nodeOptions,
        numberOfPartitions,
        partitionId,
      };
      bodies.push({
        index: indices,
      });
      bodies.push(createNodeRequestBody(processorOptions));
    }
  );
  return bodies;
}
