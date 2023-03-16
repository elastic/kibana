/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectAttributes } from '@kbn/securitysolution-io-ts-alerting-types';
import type { SavedObjectsClientContract, SavedObject } from '@kbn/core/public';
import type { Tag, TagAttributes } from '@kbn/saved-objects-tagging-plugin/common';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { SECURITY_TAG_NAME, SECURITY_INTEGRATIONS_TAG_NAME } from '../../../../common/constants';

export const SECURITY_TAG_DESCRIPTION = 'Security Solution auto-generated tag' as const;

/**
 * Returns the hex representation of a random color (e.g `#F1B7E2`)
 */
const getRandomColor = (): string => {
  return `#${String(Math.floor(Math.random() * 16777215).toString(16)).padStart(6, '0')}`;
};

/**
 * Request the security tag saved object and returns the id if exists
 */
export const getSecuritySolutionTagId = async (
  savedObjectsClient: SavedObjectsClientContract
): Promise<string | undefined> => {
  const tagResponse = await savedObjectsClient.find<TagAttributes>({
    type: 'tag',
    searchFields: ['name'],
    search: `"${SECURITY_TAG_NAME}"`,
  });
  // The search query returns partial matches, we need to find the exact tag name
  return tagResponse.savedObjects.find(({ attributes }) => attributes.name === SECURITY_TAG_NAME)
    ?.id;
};

/**
 * Creates the security tag saved object and returns its id
 */
export const createSecuritySolutionTag = async (
  tagsClient: SavedObjectsTaggingApi['client']
): Promise<Tag> => {
  // We need to use the TaggingApi client to make sure the Dashboards app tags cache is refreshed
  const tagResponse = await tagsClient.create({
    name: SECURITY_TAG_NAME,
    description: SECURITY_TAG_DESCRIPTION,
    color: getRandomColor(),
  });
  return tagResponse;
};

/**
 * Requests the saved objects of the security tagged dashboards
 */
export const getSecurityDashboards = async (
  savedObjectsClient: SavedObjectsClientContract
): Promise<Array<SavedObject<SavedObjectAttributes>>> => {
  const tags = await getSecurityTags(savedObjectsClient);
  if (!tags?.length) {
    return [];
  }
  const dashboardsResponse = await savedObjectsClient.find<SavedObjectAttributes>({
    type: 'dashboard',
    hasReference: tags.map((tag) => ({ id: tag.id, type: 'tag' })),
  });
  return dashboardsResponse.savedObjects;
};

/**
 * Request the security tag saved object and returns the id if exists
 */
const getSecurityTags = async (
  savedObjectsClient: SavedObjectsClientContract
): Promise<Array<SavedObject<TagAttributes>>> => {
  const tagsResponse = await savedObjectsClient.find<TagAttributes>({
    type: 'tag',
    searchFields: ['name'],
    search: `"${SECURITY_TAG_NAME}" | "${SECURITY_INTEGRATIONS_TAG_NAME}"`,
  });
  // The search query returns partial matches, we need to filter by the exact tag names
  return tagsResponse.savedObjects.filter(
    ({ attributes }) =>
      attributes.name === SECURITY_TAG_NAME || attributes.name === SECURITY_INTEGRATIONS_TAG_NAME
  );
};
