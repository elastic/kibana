/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { ENTITY_INDICES_PATTERN } from '../../../common/constants_entities';
import { SO_ENTITY_DEFINITION_TYPE, SO_ENTITY_DISCOVERY_API_KEY_TYPE } from '../../saved_objects';
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

const canManageAPIKey = async (client: ElasticsearchClient) => {
  const { has_all_requested: hasAllRequested } = await client.security.hasPrivileges({
    body: apiKeyCreationPrivileges,
  });

  return hasAllRequested;
};

const canDeleteAPIKey = async (client: ElasticsearchClient) => {
  const { has_all_requested: hasAllRequested } = await client.security.hasPrivileges({
    body: apiKeyDeletionPrivileges,
  });

  return hasAllRequested;
};

export const canEnableEntityDiscovery = async (client: ElasticsearchClient) => {
  return Promise.all([canManageAPIKey(client), canManageEntityDefinition(client)]).then((results) =>
    results.every(Boolean)
  );
};

export const canDisableEntityDiscovery = async (client: ElasticsearchClient) => {
  return Promise.all([canDeleteAPIKey(client), canDeleteEntityDefinition(client)]).then((results) =>
    results.every(Boolean)
  );
};

export const entityDefinitionRuntimePrivileges = {
  cluster: ['manage_transform', 'manage_ingest_pipelines', 'manage_index_templates'],
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
      privileges: [`saved_object:${SO_ENTITY_DEFINITION_TYPE}/*`],
      resources: ['*'],
    },
  ],
};

export const entityDefinitionDeletionPrivileges = {
  cluster: ['manage_transform', 'manage_ingest_pipelines', 'manage_index_templates'],
  index: [
    {
      names: [ENTITY_INDICES_PATTERN],
      privileges: ['delete_index'],
    },
  ],
  application: [
    {
      application: 'kibana-.kibana',
      privileges: [`saved_object:${SO_ENTITY_DEFINITION_TYPE}/delete`],
      resources: ['*'],
    },
  ],
};

export const apiKeyCreationPrivileges = {
  application: [
    {
      application: 'kibana-.kibana',
      privileges: [`saved_object:${SO_ENTITY_DISCOVERY_API_KEY_TYPE}/*`],
      resources: ['*'],
    },
  ],
};

const apiKeyDeletionPrivileges = {
  application: [
    {
      application: 'kibana-.kibana',
      privileges: [`saved_object:${SO_ENTITY_DISCOVERY_API_KEY_TYPE}/delete`],
      resources: ['*'],
    },
  ],
};
