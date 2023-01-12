/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import SecurityApi from '@elastic/elasticsearch/lib/api/api/security';
import { SecurityPutRoleResponse } from '@elastic/elasticsearch/lib/api/types';

export async function createReaderRole(client: SecurityApi): Promise<SecurityPutRoleResponse> {
  return client.putRole({
    name: 'profiling-reader',
    indices: [
      {
        names: ['profiling-*'],
        privileges: ['read', 'view_index_metadata'],
      },
    ],
    cluster: ['monitor'],
  });
}
