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
import { RISK_SCORE_TAG_DESCRIPTION, getRiskScoreTagName } from './utils';
import type { BulkCreateSavedObjectsResult } from '../types';
import { createTag, findTagsByName } from '../../../tags/saved_objects';

export const createRiskScoreTag = async ({
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

  try {
    // check the tag does not already exist
    const [existingRiskScoreTag] = await findTagsByName({ savedObjectsClient, tagName });
    if (existingRiskScoreTag?.id != null) {
      logger.error(`${savedObjectTemplate} already exists`);
      return {
        [savedObjectTemplate]: {
          success: false,
          error: i18n.translate(
            'xpack.securitySolution.riskScore.savedObjects.templateAlreadyExistsTitle',
            {
              values: { savedObjectTemplate },
              defaultMessage: `Failed to import saved objects: {savedObjectTemplate} were not created as already exist`,
            }
          ),
        },
      };
    }
  } catch (err) {
    const error = transformError(err);
    logger.error(
      `${savedObjectTemplate} cannot be installed as failed to find the tag: ${tagName} - ${error?.message}`
    );
    return {
      [savedObjectTemplate]: {
        success: false,
        error: i18n.translate(
          'xpack.securitySolution.riskScore.savedObjects.failedToFindTagTitle',
          {
            values: { savedObjectTemplate, tagName },
            defaultMessage: `Failed to import saved objects: {savedObjectTemplate} were not created as failed to find the tag: {tagName}`,
          }
        ),
      },
    };
  }

  try {
    const createTagResponse = await createTag({
      savedObjectsClient,
      tagName,
      description: RISK_SCORE_TAG_DESCRIPTION,
      color: '#6edb7f',
    });
    return {
      [savedObjectTemplate]: {
        success: true,
        error: null,
        body: {
          type: 'tag',
          id: createTagResponse?.id,
          name: createTagResponse.attributes.name,
          description: createTagResponse.attributes.description,
        },
      },
    };
  } catch (err) {
    const error = transformError(err);
    logger.error(
      `${savedObjectTemplate} cannot be installed as failed to create the tag: ${tagName} - ${error?.message}`
    );
    return {
      [savedObjectTemplate]: {
        success: false,
        error: i18n.translate(
          'xpack.securitySolution.riskScore.savedObjects.failedToCreateTagTitle',
          {
            values: { savedObjectTemplate, tagName },
            defaultMessage: `Failed to import saved objects: {savedObjectTemplate} were not created as failed to create the tag: {tagName}`,
          }
        ),
      },
    };
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
