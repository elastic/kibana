/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { RiskScoreEntity } from '../../../../../common/search_strategy';
import type { Tag } from './utils';
import { RISK_SCORE_TAG_DESCRIPTION, getRiskScoreTagName } from './utils';

export const findRiskScoreTag = async ({
  savedObjectsClient,
  search,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  search: string;
}) => {
  const tagResponse = await savedObjectsClient.find<Tag>({
    type: 'tag',
    search,
    searchFields: ['name'],
    sortField: 'updated_at',
    sortOrder: 'desc',
  });

  const existingRiskScoreTag = tagResponse.saved_objects.find(
    ({ attributes }) => attributes.name === search
  );

  return existingRiskScoreTag
    ? {
        id: existingRiskScoreTag.id,
        name: existingRiskScoreTag?.attributes.name,
        type: existingRiskScoreTag.type,
      }
    : undefined;
};

export const findOrCreateRiskScoreTag = async ({
  riskScoreEntity,
  savedObjectsClient,
  spaceId = 'default',
}: {
  riskScoreEntity: RiskScoreEntity;
  savedObjectsClient: SavedObjectsClientContract;
  spaceId?: string;
}) => {
  const tagName = getRiskScoreTagName(riskScoreEntity, spaceId);

  const existingRiskScoreTag = await findRiskScoreTag({
    savedObjectsClient,
    search: tagName,
  });

  const tag = {
    id: existingRiskScoreTag?.id,
    type: 'tag',
    name: tagName,
    description: RISK_SCORE_TAG_DESCRIPTION,
  };

  if (existingRiskScoreTag?.id != null) {
    return tag;
  } else {
    const { id: tagId } = await savedObjectsClient.create('tag', {
      name: tagName,
      description: RISK_SCORE_TAG_DESCRIPTION,
      color: '#6edb7f',
    });

    return { ...tag, id: tagId };
  }
};

export const findSavedObjectsWithTagReference = async ({
  savedObjectsClient,
  savedObjectTypes,
  tagId,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectTypes: string | string[];
  tagId: string;
}) => {
  const linkedSavedObjects = await savedObjectsClient.find({
    type: savedObjectTypes,
    hasReference: {
      type: 'tag',
      id: tagId,
    },
  });

  return linkedSavedObjects?.saved_objects;
};
