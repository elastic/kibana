/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraNodeType } from '../../../graphql/types';
// TODO: Make NODE_REQUEST_PARTITION_SIZE configurable from kibana.yml
export const NODE_REQUEST_PARTITION_SIZE = 75;
export const NODE_REQUEST_PARTITION_FACTOR = 1.2;
export const NAME_FIELDS = {
  [InfraNodeType.host]: 'host.name',
  [InfraNodeType.pod]: 'kubernetes.pod.name',
  [InfraNodeType.container]: 'container.name',
};
