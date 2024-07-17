/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SecurityHasPrivilegesApplicationPrivilegesCheck,
  SecurityHasPrivilegesApplicationsPrivileges,
} from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';
import { ENTITY_INDICES_PATTERN } from '../../../common/constants_entities';
import { BUILT_IN_ALLOWED_INDICES } from '../entities/built_in/constants';

export const canManageEntityDefinition = async (client: ElasticsearchClient) => {
  const { has_all_requested: hasAllRequested } = await client.security.hasPrivileges({
    body: entityDefinitionRuntimePrivileges,
  });

  return hasAllRequested;
};

const canDeleteEntityDefinition = async (client: ElasticsearchClient) => {
  const { has_all_requested: hasAllRequested } = await client.security.hasPrivileges({
    body: entityDefinitionDeletionPrivileges,
  });

  return hasAllRequested;
};

const canCreateAPIKey = async (client: ElasticsearchClient) => {
  const { cluster, application } = await client.security.hasPrivileges({
    body: apiKeyCreationPrivileges,
  });

  const hasClusterPrivileges = apiKeyCreationPrivileges.cluster.some((k) => cluster[k] === true);
  const hasApplicationPrivileges = hasAllApplicationPrivileges(
    apiKeyCreationPrivileges.application,
    application
  );
  return hasClusterPrivileges && hasApplicationPrivileges;
};

const canDeleteAPIKey = async (client: ElasticsearchClient) => {
  const { cluster, application } = await client.security.hasPrivileges({
    body: apiKeyDeletionPrivileges,
  });

  const hasClusterPrivileges = apiKeyDeletionPrivileges.cluster.some((k) => cluster[k] === true);
  const hasApplicationPrivileges = hasAllApplicationPrivileges(
    apiKeyDeletionPrivileges.application,
    application
  );
  return hasClusterPrivileges && hasApplicationPrivileges;
};

export const canEnableEntityDiscovery = async (client: ElasticsearchClient) => {
  return Promise.all([canCreateAPIKey(client), canManageEntityDefinition(client)]).then((results) =>
    results.every(Boolean)
  );
};

export const canDisableEntityDiscovery = async (client: ElasticsearchClient) => {
  return Promise.all([canDeleteAPIKey(client), canDeleteEntityDefinition(client)]).then((results) =>
    results.every(Boolean)
  );
};

const hasAllApplicationPrivileges = (
  requiredPrivileges: SecurityHasPrivilegesApplicationPrivilegesCheck[],
  userPrivileges: SecurityHasPrivilegesApplicationsPrivileges
) => {
  return requiredPrivileges.every(({ application, privileges, resources }) => {
    return resources.every((resource) => {
      return privileges.every((privilege) => {
        return userPrivileges[application][resource][privilege] === true;
      });
    });
  });
};

export const entityDefinitionRuntimePrivileges = {
  cluster: ['manage_transform', 'monitor_transform', 'manage_ingest_pipelines', 'monitor'],
  index: [
    {
      names: [ENTITY_INDICES_PATTERN],
      privileges: ['create_index', 'index', 'create_doc', 'auto_configure', 'read'],
    },
    {
      names: [...BUILT_IN_ALLOWED_INDICES, ENTITY_INDICES_PATTERN],
      privileges: ['read', 'view_index_metadata'],
    },
  ],
  application: [
    {
      application: 'kibana-.kibana',
      privileges: ['saved_object:entity-definition/*'],
      resources: ['*'],
    },
  ],
};

const entityDefinitionDeletionPrivileges = {
  cluster: ['manage_transform', 'manage_ingest_pipelines'],
  application: [
    {
      application: 'kibana-.kibana',
      privileges: ['saved_object:entity-definition/delete'],
      resources: ['*'],
    },
  ],
};

const apiKeyCreationPrivileges = {
  // any one of
  cluster: ['manage_security', 'manage_api_key', 'manage_own_api_key'],
  application: [
    {
      application: 'kibana-.kibana',
      privileges: ['saved_object:entity-discovery-api-key/*'],
      resources: ['*'],
    },
  ],
};

const apiKeyDeletionPrivileges = {
  // any one of
  cluster: ['manage_security', 'manage_api_key'],
  application: [
    {
      application: 'kibana-.kibana',
      privileges: ['saved_object:entity-discovery-api-key/delete'],
      resources: ['*'],
    },
  ],
};
