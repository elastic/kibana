/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraSnapshotType } from '../../../graphql/types';

const FIELDS = {
  [InfraSnapshotType.host]: 'system.load.5',
  [InfraSnapshotType.pod]: '',
  [InfraSnapshotType.container]: '',
};

export const load = (nodeType: InfraSnapshotType) => {
  const field = FIELDS[nodeType];
  if (field) {
    return { load: { avg: { field } } };
  }
};
