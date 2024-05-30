/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IScopedClusterClient,
} from '@kbn/core/server';
import { ENTITY_BASE_PREFIX } from "@kbn/assetManager-plugin/common/constants_entities";

export const entitiesIndexPattern = `${ENTITY_BASE_PREFIX}*`

export const requiredRunTimePrivileges = {
  // all of
  index: [
    'view_index_metadata',
    'create_doc',
    'auto_configure',
    'read',
  ],
  cluster: [
    'manage_transform',
    'monitor_transform',
    'manage_ingest_pipelines',
  ]
}

export const requiredEnablementPrivileges = {
  // any one of
  cluster: [
    'manage_security',
    'manage_api_key',
    'manage_own_api_key',
  ]
}

export const canRunEntityDiscovery = async (
  client: IScopedClusterClient,
) => {
  const { has_all_requested } = await client.asCurrentUser.security.hasPrivileges({
    body: {
      cluster: requiredRunTimePrivileges.cluster,
      index: [
        {
          names: [entitiesIndexPattern],
          privileges: requiredRunTimePrivileges.index,
        }
      ]
    }
  });

  return has_all_requested;
}

export const canEnableEntityDiscovery = async (
  client: IScopedClusterClient,
) => {
  const [
    canRun,
    { cluster: grantedClusterPrivileges }
  ] = await Promise.all([
    canRunEntityDiscovery(client),
    client.asCurrentUser.security.hasPrivileges({
      body: {
        cluster: requiredEnablementPrivileges.cluster,
      }
    }),
  ]);

  return canRun && requiredEnablementPrivileges.cluster.some(k => grantedClusterPrivileges[k] === true);
}
