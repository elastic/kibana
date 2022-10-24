/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APM_AGENTS_LATEST_VERSION_SAVED_OBJECT_ID, APM_AGENTS_LATEST_VERSION_SAVED_OBJECT_TYPE } from '@kbn/apm-plugin/common/apm_saved_object_constants';
import { AgentName } from '@kbn/apm-plugin/typings/es_schemas/ui/fields/agent';
import { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import { Logger } from '@kbn/core/server';

const ONE_HOUR_IN_MS = 3_600_000;

/**
 * check if Agents latest version savedObject exists
 * returns Promise<true> when there is no savedObjects associated to the type
 */
export async function checkAgentsVersionExists(
  savedObjectsClient: ISavedObjectsRepository
): Promise<boolean> {
  const response = await savedObjectsClient.find({
    perPage: 1,
    search: `"${APM_AGENTS_LATEST_VERSION_SAVED_OBJECT_ID}"`,
    type: APM_AGENTS_LATEST_VERSION_SAVED_OBJECT_TYPE,
  });

  return response.saved_objects.length > 0;
}

/**
 * Creates or overrides the savedObject associated to Agents latest version
 */
export async function saveAgentsVersion({
  savedObjectsClient,
  agentsVersion,
}: {
  savedObjectsClient: ISavedObjectsRepository;
  agentsVersion: Record<AgentName, string> | {}
}) {
  return await savedObjectsClient.create(
    APM_AGENTS_LATEST_VERSION_SAVED_OBJECT_TYPE,
    {
      ...agentsVersion
    },
    { id: APM_AGENTS_LATEST_VERSION_SAVED_OBJECT_ID, overwrite: true }
  );
}

/**
 * Gets a map that contains agentName as key and its latest version as value
 * returns Promise<{}> when the savedObject is oldest than 1hour
 */
export async function getSavedAgentsVersion({
  savedObjectsClient,
  logger,
}: {
  savedObjectsClient: ISavedObjectsRepository;
  logger: Logger;
}) {
  try {
    const agentsLatestVersion = await savedObjectsClient.get(
      APM_AGENTS_LATEST_VERSION_SAVED_OBJECT_TYPE,
      APM_AGENTS_LATEST_VERSION_SAVED_OBJECT_ID
    );

    const savedObjectDate = new Date(agentsLatestVersion.updated_at as string).getTime();
    if (savedObjectDate < Date.now() - ONE_HOUR_IN_MS) {
      return {};
    }

    return agentsLatestVersion.attributes;
  } catch (err) {
    logger.warn('Failed to fetch saved agents version data.');

    return {};
  }
}
