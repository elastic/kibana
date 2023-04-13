/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import type {
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsFindResult,
} from '@kbn/core-saved-objects-api-server';
import type { TagAttributes } from '@kbn/saved-objects-tagging-plugin/common';
import type { DashboardAttributes } from '@kbn/dashboard-plugin/common';
import type { OutputError } from '@kbn/securitysolution-es-utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { SECURITY_TAG_NAME, SECURITY_TAG_DESCRIPTION } from '../../../common/constants';
import { createTag, findTagsByName } from './saved_objects/tags';

/**
 * Returns the hex representation of a random color (e.g `#F1B7E2`)
 */
const getRandomColor = (): string => {
  return `#${String(Math.floor(Math.random() * 16777215).toString(16)).padStart(6, '0')}`;
};

export const getOrCreateSecurityTag = async ({
  logger,
  savedObjectsClient,
}: {
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<{
  response: Array<SavedObject<TagAttributes>> | null;
  error?: OutputError;
}> => {
  const { response: existingTags } = await findTagsByName({
    savedObjectsClient,
    search: SECURITY_TAG_NAME,
  });

  if (existingTags && existingTags.length > 0) {
    return { response: existingTags };
  } else {
    const { error, response: createdTag } = await createTag({
      savedObjectsClient,
      tagName: SECURITY_TAG_NAME,
      description: SECURITY_TAG_DESCRIPTION,
      color: getRandomColor(),
    });

    if (createdTag && !error) {
      return { response: [createdTag] };
    } else {
      logger.error(`Failed to create ${SECURITY_TAG_NAME} tag - ${JSON.stringify(error?.message)}`);
      return {
        response: null,
        error: error ?? transformError(new Error(`Failed to create ${SECURITY_TAG_NAME} tag`)),
      };
    }
  }
};

export const getSecuritySolutionDashboards = async ({
  logger,
  savedObjectsClient,
}: {
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<{
  response: Array<SavedObjectsFindResult<DashboardAttributes>> | null;
  error?: OutputError;
}> => {
  const { response: foundTags } = await findTagsByName({
    savedObjectsClient,
    search: SECURITY_TAG_NAME,
  });

  if (!foundTags || foundTags?.length === 0) {
    return { response: [] };
  }

  try {
    const dashboardsResponse = await savedObjectsClient.find<DashboardAttributes>({
      type: 'dashboard',
      hasReference: foundTags.map(({ id: tagId }) => ({ id: tagId, type: 'tag' })),
    });
    return { response: dashboardsResponse.saved_objects };
  } catch (e) {
    logger.error(`Failed to get SecuritySolution Dashboards - ${JSON.stringify(e?.message)}`);

    return { response: null, error: transformError(e) };
  }
};
