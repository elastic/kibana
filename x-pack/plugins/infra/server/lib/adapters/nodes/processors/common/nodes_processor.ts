/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set } from 'lodash';

import { InfraESSearchBody, InfraNodeType, InfraProcesorRequestOptions } from '../../adapter_types';
import { NODE_REQUEST_PARTITION_FACTOR, NODE_REQUEST_PARTITION_SIZE } from '../../constants';

const nodeTypeToField = (options: InfraProcesorRequestOptions): string => {
  const { fields } = options.nodeOptions.sourceConfiguration;
  switch (options.nodeType) {
    case InfraNodeType.pod:
      return fields.pods;
    case InfraNodeType.container:
      return fields.containers;
    default:
      return fields.hosts;
  }
};

export const nodesProcessor = (options: InfraProcesorRequestOptions) => {
  return (doc: InfraESSearchBody) => {
    const field = nodeTypeToField(options);

    set(doc, 'aggs.waffle.aggs.nodes.terms', {
      field,
      include: {
        num_partitions: options.numberOfPartitions,
        partition: options.partitionId,
      },
      order: { _key: 'asc' },
      size: NODE_REQUEST_PARTITION_SIZE * NODE_REQUEST_PARTITION_FACTOR,
    });
    return doc;
  };
};
