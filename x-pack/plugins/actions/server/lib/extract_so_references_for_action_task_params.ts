/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from 'src/core/server/types';
import { RelatedSavedObjectRef, RelatedSavedObjects } from './related_saved_objects';

const ACTION_REF_NAME = `actionRef`;

export function extractSavedObjectReferences(
  actionId: string,
  isPreconfigured: boolean,
  relatedSavedObjects?: RelatedSavedObjects
): {
  actionIdOrRef: string;
  references: SavedObjectReference[];
  relatedSavedObjectRefs?: RelatedSavedObjectRef[];
} {
  const references: SavedObjectReference[] = [];
  const relatedSavedObjectRefs: RelatedSavedObjectRef[] = [];

  // Add action saved object to reference if it is not preconfigured
  if (!isPreconfigured) {
    references.push({
      id: actionId,
      name: ACTION_REF_NAME,
      type: 'action',
    });
  }

  // Add related saved objects, if any
  (relatedSavedObjects ?? []).forEach((relatedSavedObject, index) => {
    const { id, ...restRelatedSavedObject } = relatedSavedObject;
    relatedSavedObjectRefs.push({
      ...restRelatedSavedObject,
      ref: `related_${relatedSavedObject.type}_${index}`,
    });
    references.push({
      id: relatedSavedObject.id,
      name: `related_${relatedSavedObject.type}_${index}`,
      type: relatedSavedObject.type,
    });
  });

  return {
    actionIdOrRef: isPreconfigured ? actionId : ACTION_REF_NAME,
    references,
    ...(relatedSavedObjects ? { relatedSavedObjectRefs } : {}),
  };
}
