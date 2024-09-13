/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { RiskScoreEntity } from '../../../../../common/search_strategy';
import { findTagsByName } from '../../../tags/saved_objects';
import * as savedObjectsToCreate from '../saved_object';
import type { SavedObjectTemplate } from '../types';
import { findSavedObjectsWithTagReference } from './create_risk_score_tag';
import { RISK_SCORE_REPLACE_ID_MAPPINGS, getRiskScoreTagName } from './utils';

const deleteSavedObject = async ({
  checkObjectExists,
  savedObjectsClient,
  options: { type, id },
}: {
  checkObjectExists?: boolean;
  savedObjectsClient: SavedObjectsClientContract;
  options: { type: string; id: string };
}) => {
  try {
    if (checkObjectExists) {
      await savedObjectsClient.get(type, id);
    }
    await savedObjectsClient.delete(type, id);
    return `Deleted saved object: ${id}`;
  } catch (e) {
    return e?.output?.payload?.message ?? `Failed to delete saved object: ${id}`;
  }
};

const deleteSavedObjects = async ({
  checkObjectExists,
  savedObjects,
  savedObjectsClient,
}: {
  checkObjectExists?: boolean;
  savedObjectsClient: SavedObjectsClientContract;
  savedObjects: Array<{ id: string; type: string }>;
}) => {
  const result = await Promise.all(
    savedObjects.map((so) => {
      return deleteSavedObject({
        checkObjectExists,
        savedObjectsClient,
        options: { type: so.type, id: so.id },
      });
    })
  );

  return result;
};

const deleteSavedObjectsWithTag = async ({
  savedObjectsClient,
  savedObjectTypes,
  tagId,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectTypes: string[];
  tagId: string;
}) => {
  const linkedSavedObjects = await findSavedObjectsWithTagReference({
    savedObjectsClient,
    savedObjectTypes,
    tagId,
  });

  const deletedIds = await deleteSavedObjects({
    checkObjectExists: false,
    savedObjectsClient,
    savedObjects: linkedSavedObjects,
  });
  const deletedTagId = await deleteSavedObject({
    savedObjectsClient,
    options: { type: 'tag', id: tagId },
  });

  return [...deletedIds, deletedTagId];
};

export const bulkDeleteSavedObjects = async ({
  deleteAll,
  savedObjectsClient,
  spaceId,
  savedObjectTemplate,
}: {
  deleteAll?: boolean;
  savedObjectsClient: SavedObjectsClientContract;
  spaceId?: string;
  savedObjectTemplate: SavedObjectTemplate;
}) => {
  const savedObjects = savedObjectsToCreate[savedObjectTemplate];
  const idReplaceMappings = RISK_SCORE_REPLACE_ID_MAPPINGS[savedObjectTemplate];
  const riskScoreEntity =
    savedObjectTemplate === 'userRiskScoreDashboards' ? RiskScoreEntity.user : RiskScoreEntity.host;

  if (savedObjects == null) {
    return new Error('Template not found.');
  }

  const tagName = getRiskScoreTagName(riskScoreEntity, spaceId);
  const [tag] = await findTagsByName({ savedObjectsClient, tagName });

  /**
   * This is to delete the saved objects installed before 8.5
   * These saved objects were created according to these mappings:
   * prebuilt_saved_objects/helpers/utils.ts RISK_SCORE_REPLACE_ID_MAPPINGS
   * */
  const regex = /<REPLACE-WITH-SPACE>/g;

  const deleteLegacySavedObjectResults = await deleteSavedObjects({
    checkObjectExists: true,
    savedObjectsClient,
    savedObjects: savedObjects.map((so) => {
      const legacyId = idReplaceMappings[so.id] ?? so.id;
      return {
        id: spaceId ? legacyId.replace(regex, spaceId) : legacyId,
        type: so.type,
      };
    }),
  });

  let deleteSavedObjectResults: string[] = [];
  if (tag && deleteAll) {
    /**
     * Since 8.5 all the saved objects are created with dynamic ids and all link to a tag.
     * (As create saved objects with static ids causes conflict across different spaces)
     * so just need to delete all the objects that links to the tag
     * and the tag itself
     * */
    const savedObjectsTypes = new Set(savedObjects.map((so) => so.type));
    deleteSavedObjectResults = await deleteSavedObjectsWithTag({
      savedObjectsClient,
      tagId: tag.id,
      savedObjectTypes: Array.from(savedObjectsTypes),
    });
  }

  return [...deleteLegacySavedObjectResults, ...deleteSavedObjectResults];
};
