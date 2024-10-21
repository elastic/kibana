/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { isArray } from 'lodash';
import { ENTITY_INTERNAL_INDICES_PATTERN } from '../../../common/constants_entities';
import { SO_SEM_API_KEY_TYPE, SO_SEM_DEFINITION_TYPE } from '../../saved_objects';
import { STREAM_ENTITIES_INDEX } from '../../../common/constants';

export const canManageDefinition = async (
  client: ElasticsearchClient,
  definitionId: string | string[]
) => {
  const { has_all_requested: hasAllRequested } = await client.security.hasPrivileges({
    body: DefinitionRuntimePrivileges(definitionId),
  });

  return hasAllRequested;
};

const canDeleteDefinition = async (client: ElasticsearchClient) => {
  const { has_all_requested: hasAllRequested } = await client.security.hasPrivileges({
    body: DefinitionDeletionPrivileges,
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

export const canEnableStreamEntitiesManager = async (
  client: ElasticsearchClient,
  definitionId: string | string[]
) => {
  return Promise.all([canManageAPIKey(client), canManageDefinition(client, definitionId)]).then(
    (results) => results.every(Boolean)
  );
};

export const canDisableStreamEntitiesManager = async (client: ElasticsearchClient) => {
  return Promise.all([canDeleteAPIKey(client), canDeleteDefinition(client)]).then((results) =>
    results.every(Boolean)
  );
};

export const DefinitionRuntimePrivileges = (definitionId: string | string[]) => {
  const names = isArray(definitionId) ? definitionId.map((id) => `.${id}`) : [`.${definitionId}`];
  return {
    cluster: ['manage_transform', 'manage_ingest_pipelines', 'manage_index_templates'],
    index: [
      {
        names: [...names, STREAM_ENTITIES_INDEX],
        privileges: [
          'create_index',
          'index',
          'create_doc',
          'auto_configure',
          'read',
          'view_index_metadata',
        ],
      },
    ],
    application: [
      {
        application: 'kibana-.kibana',
        privileges: [
          `saved_object:${SO_SEM_DEFINITION_TYPE}/*`,
          'feature_stackAlerts.all',
          'feature_rulesSettings.all',
          'feature_logs.all',
          'feature_infrastructure.all',
          'feature_apm.all',
          'feature_uptime.all',
          'feature_observabilityCases.all',
          'feature_slo.all',
          'feature_observabilityAIAssistant.all',
        ],
        resources: ['*'],
      },
    ],
  };
};

export const DefinitionDeletionPrivileges = {
  cluster: ['manage_transform', 'manage_ingest_pipelines', 'manage_index_templates'],
  index: [
    {
      names: [ENTITY_INTERNAL_INDICES_PATTERN],
      privileges: ['delete_index'],
    },
  ],
  application: [
    {
      application: 'kibana-.kibana',
      privileges: [`saved_object:${SO_SEM_DEFINITION_TYPE}/delete`],
      resources: ['*'],
    },
  ],
};

export const apiKeyCreationPrivileges = {
  application: [
    {
      application: 'kibana-.kibana',
      privileges: [`saved_object:${SO_SEM_API_KEY_TYPE}/*`],
      resources: ['*'],
    },
  ],
};

const apiKeyDeletionPrivileges = {
  application: [
    {
      application: 'kibana-.kibana',
      privileges: [`saved_object:${SO_SEM_API_KEY_TYPE}/delete`],
      resources: ['*'],
    },
  ],
};
