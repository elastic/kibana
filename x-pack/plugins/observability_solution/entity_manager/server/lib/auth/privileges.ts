/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { ENTITY_BASE_PREFIX } from '../../../common/constants_entities';
import { BUILT_IN_ALLOWED_INDICES } from '../entities/built_in/constants';

export const requiredRunTimePrivileges = {
  // all of
  index: [
    {
      names: [`${ENTITY_BASE_PREFIX}*`],
      privileges: ['create_index', 'index', 'create_doc', 'auto_configure', 'read'],
    },
    {
      names: [...BUILT_IN_ALLOWED_INDICES, `${ENTITY_BASE_PREFIX}*`],
      privileges: ['read', 'view_index_metadata'],
    },
  ],
  cluster: ['manage_transform', 'monitor_transform', 'manage_ingest_pipelines', 'monitor'],
  application: [
    {
      application: 'kibana-.kibana',
      privileges: ['saved_object:entity-definition/*'],
      resources: ['*'],
    },
  ],
};

export const requiredEnablementPrivileges = {
  // any one of
  cluster: ['manage_security', 'manage_api_key', 'manage_own_api_key'],
};

export const canRunEntityDiscovery = async (client: ElasticsearchClient) => {
  const { has_all_requested: hasAllRequested } = await client.security.hasPrivileges({
    body: {
      cluster: requiredRunTimePrivileges.cluster,
      index: requiredRunTimePrivileges.index,
      application: requiredRunTimePrivileges.application,
    },
  });

  return hasAllRequested;
};

export const canEnableEntityDiscovery = async (client: ElasticsearchClient) => {
  const [canRun, { cluster: grantedClusterPrivileges }] = await Promise.all([
    canRunEntityDiscovery(client),
    client.security.hasPrivileges({
      body: {
        cluster: requiredEnablementPrivileges.cluster,
      },
    }),
  ]);

  return (
    canRun && requiredEnablementPrivileges.cluster.some((k) => grantedClusterPrivileges[k] === true)
  );
};
