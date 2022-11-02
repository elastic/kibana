/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { i18n } from '@kbn/i18n';
import type { RiskScoreEntity } from '../../../../../common/search_strategy';
import type { Tag } from './utils';
import { RISK_SCORE_TAG_DESCRIPTION, getRiskScoreTagName } from './utils';
import type { BulkCreateSavedObjectsResult } from '../types';

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
  logger,
  savedObjectsClient,
  spaceId = 'default',
}: {
  logger: Logger;
  riskScoreEntity: RiskScoreEntity;
  savedObjectsClient: SavedObjectsClientContract;
  spaceId?: string;
}): Promise<BulkCreateSavedObjectsResult> => {
  const tagName = getRiskScoreTagName(riskScoreEntity, spaceId);
  const savedObjectTemplate = `${riskScoreEntity}RiskScoreDashboards`;
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
    logger.error(`${savedObjectTemplate} already exists`);
    return {
      [savedObjectTemplate]: {
        success: false,
        error: transformError(
          new Error(
            i18n.translate(
              'xpack.securitySolution.riskScore.savedObjects.templateAlreadyExistsTitle',
              {
                values: { savedObjectTemplate },
                defaultMessage: `Failed to import saved objects: {savedObjectTemplate} were not created as already exist`,
              }
            )
          )
        ),
      },
    };
  } else {
    try {
      const { id: tagId } = await savedObjectsClient.create('tag', {
        name: tagName,
        description: RISK_SCORE_TAG_DESCRIPTION,
        color: '#6edb7f',
      });

      return {
        [savedObjectTemplate]: {
          success: true,
          error: null,
          body: { ...tag, id: tagId },
        },
      };
    } catch (e) {
      logger.error(
        `${savedObjectTemplate} cannot be installed as failed to create the tag: ${tagName}`
      );
      return {
        [savedObjectTemplate]: {
          success: false,
          error: transformError(
            new Error(
              i18n.translate(
                'xpack.securitySolution.riskScore.savedObjects.failedToCreateTagTitle',
                {
                  values: { savedObjectTemplate, tagName },
                  defaultMessage: `Failed to import saved objects: {savedObjectTemplate} were not created as failed to create the tag: {tagName}`,
                }
              )
            )
          ),
        },
      };
    }
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
