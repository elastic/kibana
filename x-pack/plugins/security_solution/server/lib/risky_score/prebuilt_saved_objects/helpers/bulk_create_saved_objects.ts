/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import type { FrameworkRequest } from '../../../framework';
import * as savedObjectsToCreate from '../saved_object';
import type { SavedObjectTemplate } from '../types';

export const bulkCreateSavedObjects = async ({
  request,
  spaceId,
  savedObjectTemplate,
}: {
  request: FrameworkRequest;
  spaceId?: string;
  savedObjectTemplate: SavedObjectTemplate;
}) => {
  const savedObjectsClient = (await request.context.core).savedObjects.client;
  const regex = /<REPLACE-WITH-SPACE>/g;
  const RISK_SCORE_TAG_NAME = 'Risk Score' as const;
  const RISK_SCORE_TAG_DESCRIPTION = 'Security Solution Risk Score auto-generated tag' as const;

  const {
    id: tagId,
    attributes: { name },
    type,
  } = await savedObjectsClient.create('tag', {
    name: `${RISK_SCORE_TAG_NAME} - ${spaceId}`,
    description: RISK_SCORE_TAG_DESCRIPTION,
    color: '#6edb7f',
  });

  const mySavedObjects = savedObjectsToCreate[savedObjectTemplate];

  const idReplaceMappings: Record<string, string> = {};
  mySavedObjects.forEach((so, i) => {
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
      references: [...references, { id: tagId, name, type }],
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
