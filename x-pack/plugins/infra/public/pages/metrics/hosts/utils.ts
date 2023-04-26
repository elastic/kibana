/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter } from '@kbn/es-query';
import { SnapshotNode } from '../../../../common/http_api';

export const createHostsFilter = (hostNodes: SnapshotNode[]): Filter => {
  return {
    query: {
      terms: {
        'host.name': hostNodes.map((p) => p.name),
      },
    },
    meta: {},
  };
};
