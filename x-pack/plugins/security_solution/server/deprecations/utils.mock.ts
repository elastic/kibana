/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Role } from '../../../security/common/model';
import { elasticsearchServiceMock, savedObjectsClientMock } from 'src/core/server/mocks';

const emptyRole: Role = {
  name: 'mockRole',
  metadata: { _reserved: false },
  elasticsearch: { cluster: [], indices: [], run_as: [] },
  kibana: [{ spaces: [], base: [], feature: {} }],
};

export const getRoleMock = (
  indicesOverrides: Role['elasticsearch']['indices'] = [],
  name = 'mockRole'
): Role => ({
  ...emptyRole,
  name,
  elasticsearch: {
    ...emptyRole.elasticsearch,
    indices: indicesOverrides,
  },
});

export const getContextMock = () => ({
  esClient: elasticsearchServiceMock.createScopedClusterClient(),
  savedObjectsClient: savedObjectsClientMock.create(),
});
