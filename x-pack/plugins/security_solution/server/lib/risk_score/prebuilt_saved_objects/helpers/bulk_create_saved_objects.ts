/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import uuid from 'uuid';
import { RiskScoreEntity } from '../../../../../common/search_strategy';
import * as savedObjectsToCreate from '../saved_object';
import type { SavedObjectTemplate } from '../types';
import { findOrCreateRiskScoreTag } from './find_or_create_tag';

export const bulkCreateSavedObjects = async ({
  savedObjectsClient,
  spaceId,
  savedObjectTemplate,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  spaceId?: string;
  savedObjectTemplate: SavedObjectTemplate;
}) => {
  const regex = /<REPLACE-WITH-SPACE>/g;

  const riskScoreEntity =
    savedObjectTemplate === 'userRiskScoreDashboards' ? RiskScoreEntity.user : RiskScoreEntity.host;
  const tag = await findOrCreateRiskScoreTag({ riskScoreEntity, savedObjectsClient, spaceId });

  const mySavedObjects = savedObjectsToCreate[savedObjectTemplate];

  const idReplaceMappings: Record<string, string> = {};
  mySavedObjects.forEach((so) => {
    if (so.id.startsWith('<REPLACE-WITH-ID')) {
      idReplaceMappings[so.id] = uuid.v4();
    }
  });
  const mySavedObjectsWithRef = mySavedObjects.map((so) => {
    const references =
      so.references?.map((ref) => {
        return { ...ref, id: idReplaceMappings[ref.id] ?? ref.id };
      }) ?? [];
    return {
      ...so,
      id: idReplaceMappings[so.id] ?? so.id,
      references: [...references, { id: tag.id, name: tag.name, type: tag.type }],
    };
  });

  const savedObjects = JSON.stringify(mySavedObjectsWithRef);

  if (savedObjects == null) {
    return new Error('Template not found.');
  }

  const replacedSO = spaceId ? savedObjects.replace(regex, spaceId) : savedObjects;

  const createSO = await savedObjectsClient.bulkCreate(JSON.parse(replacedSO), {
    overwrite: true,
  });

  return createSO;
};
