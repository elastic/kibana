/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraPathType } from '../../../../common/graphql/types';

interface DomainToFieldLookup {
  [InfraPathType.hosts]: 'beat.hostname';
  [InfraPathType.pods]: 'kubernetes.pod.name';
  [InfraPathType.containers]: 'docker.container.name';
  [key: string]: string;
}

export const DOMAIN_TO_FIELD: DomainToFieldLookup = {
  [InfraPathType.hosts]: 'beat.hostname',
  [InfraPathType.pods]: 'kubernetes.pod.name',
  [InfraPathType.containers]: 'docker.container.name',
};

// TODO: Make NODE_REQUEST_PARTITION_SIZE configurable from kibana.yml
export const NODE_REQUEST_PARTITION_SIZE = 75;
export const NODE_REQUEST_PARTITION_FACTOR = 1.2;
