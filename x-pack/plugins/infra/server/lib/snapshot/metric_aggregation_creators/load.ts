/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraNodeType } from '../../../graphql/types';

const FIELDS = {
  [InfraNodeType.host]: 'system.load.5',
  [InfraNodeType.pod]: '',
  [InfraNodeType.container]: '',
};

export const load = (nodeType: InfraNodeType) => {
  const field = FIELDS[nodeType];
  if (field) {
    return { load: { avg: { field } } };
  }
};
