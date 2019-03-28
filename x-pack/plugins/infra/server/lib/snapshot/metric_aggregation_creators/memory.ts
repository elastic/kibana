/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraSnapshotType } from '../../../graphql/types';

const FIELDS = {
  [InfraSnapshotType.host]: 'system.memory.actual.used.pct',
  [InfraSnapshotType.pod]: 'kubernetes.pod.memory.usage.node.pct',
  [InfraSnapshotType.container]: 'docker.memory.usage.pct',
};

export const memory = (nodeType: InfraSnapshotType) => {
  return { memory: { avg: { field: FIELDS[nodeType] } } };
};
