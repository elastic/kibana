/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ISavedObjectsRepository,
  SavedObjectsFindResponse,
} from '@kbn/core-saved-objects-api-server';
import { Logger } from '@kbn/core/server';
import {
  APM_AGENTS_LATEST_VERSION_SAVED_OBJECT_ID,
  APM_AGENTS_LATEST_VERSION_SAVED_OBJECT_TYPE,
} from '../../../../common/apm_saved_object_constants';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';

const ONE_HOUR_IN_MS = 3_600_000;

/**
 * Find agents latest version savedObject
 * returns Promise<true> when there is no savedObjects associated to the type
 */
export async function getSavedObjectAgentsVersion(
  savedObjectsClient: ISavedObjectsRepository
): Promise<SavedObjectsFindResponse> {
  return await savedObjectsClient.find({
    type: APM_AGENTS_LATEST_VERSION_SAVED_OBJECT_TYPE,
  });
}

/**
 * Creates or overrides the savedObject associated to Agents latest version
 */
export async function saveAgentsVersion({
  savedObjectsClient,
  agentsVersion,
}: {
  savedObjectsClient: ISavedObjectsRepository;
  agentsVersion: Record<AgentName, string> | {};
}) {
  return await savedObjectsClient.create(
    APM_AGENTS_LATEST_VERSION_SAVED_OBJECT_TYPE,
    {
      ...agentsVersion,
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
  const savedObjectAgentsVersion = await getSavedObjectAgentsVersion(
    savedObjectsClient
  );
  if (savedObjectAgentsVersion.saved_objects.length === 0) {
    await saveAgentsVersion({ savedObjectsClient, agentsVersion: {} });
    return {};
  }

  try {
    const savedObjectDate = new Date(
      savedObjectAgentsVersion.saved_objects[0].updated_at as string
    ).getTime();
    if (savedObjectDate < Date.now() - ONE_HOUR_IN_MS) {
      return {};
    }

    return savedObjectAgentsVersion.saved_objects[0].attributes;
  } catch (err) {
    logger.warn('Failed to fetch saved agents version data.');

    return {};
  }
}
