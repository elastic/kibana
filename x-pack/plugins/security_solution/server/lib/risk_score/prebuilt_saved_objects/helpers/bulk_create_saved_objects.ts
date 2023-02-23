/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { Logger } from '@kbn/core/server';

import { v4 as uuidv4 } from 'uuid';
import { i18n } from '@kbn/i18n';
import { RiskScoreEntity } from '../../../../../common/search_strategy';
import * as savedObjectsToCreate from '../saved_object';
import type { BulkCreateSavedObjectsResult, SavedObjectTemplate } from '../types';
import { findOrCreateRiskScoreTag } from './find_or_create_tag';

export const bulkCreateSavedObjects = async <T = SavedObjectTemplate>({
  logger,
  savedObjectsClient,
  spaceId,
  savedObjectTemplate,
}: {
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
  spaceId?: string;
  savedObjectTemplate: SavedObjectTemplate;
}): Promise<BulkCreateSavedObjectsResult> => {
  const regex = /<REPLACE-WITH-SPACE>/g;

  const riskScoreEntity =
    savedObjectTemplate === 'userRiskScoreDashboards' ? RiskScoreEntity.user : RiskScoreEntity.host;

  const tagResponse = await findOrCreateRiskScoreTag({
    riskScoreEntity,
    logger,
    savedObjectsClient,
    spaceId,
  });

  const tagResult = tagResponse?.hostRiskScoreDashboards ?? tagResponse?.userRiskScoreDashboards;

  if (!tagResult?.success) {
    return tagResponse;
  }

  const mySavedObjects = savedObjectsToCreate[savedObjectTemplate];

  if (!mySavedObjects) {
    logger.error(`${savedObjectTemplate} template not found`);
    return {
      [savedObjectTemplate]: {
        success: false,
        error: transformError(
          new Error(
            i18n.translate('xpack.securitySolution.riskScore.savedObjects.templateNotFoundTitle', {
              values: { savedObjectTemplate },
              defaultMessage: `Failed to import saved objects: {savedObjectTemplate} were not created as template not found`,
            })
          )
        ),
      },
    };
  }

  const idReplaceMappings: Record<string, string> = {};
  mySavedObjects.forEach((so) => {
    if (so.id.startsWith('<REPLACE-WITH-ID')) {
      idReplaceMappings[so.id] = uuidv4();
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
      references: [
        ...references,
        { id: tagResult?.body?.id, name: tagResult?.body?.name, type: tagResult?.body?.type },
      ],
    };
  });

  const savedObjects = JSON.stringify(mySavedObjectsWithRef);

  const replacedSO = spaceId ? savedObjects.replace(regex, spaceId) : savedObjects;

  try {
    const result = await savedObjectsClient.bulkCreate<{
      title: string;
      name: string;
    }>(JSON.parse(replacedSO), {
      overwrite: true,
    });

    return {
      [savedObjectTemplate]: {
        success: true,
        error: null,
        body: result.saved_objects.map(({ id, type, attributes: { title, name } }) => ({
          id,
          type,
          title,
          name,
        })),
      },
    };
  } catch (error) {
    const err = transformError(error);
    logger.error(`Failed to create saved object: ${savedObjectTemplate}: ${err.message}`);
    return { [savedObjectTemplate]: { success: false, error: err } };
  }
};
