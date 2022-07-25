/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectAttribute, SavedObjectReference } from '@kbn/core/server/types';
import { RelatedSavedObjects } from './related_saved_objects';

export const ACTION_REF_NAME = `actionRef`;

export function extractSavedObjectReferences(
  actionId: string,
  isPreconfigured: boolean,
  relatedSavedObjects?: RelatedSavedObjects
): {
  references: SavedObjectReference[];
  relatedSavedObjectWithRefs?: RelatedSavedObjects;
} {
  const references: SavedObjectReference[] = [];
  const relatedSavedObjectWithRefs: RelatedSavedObjects = [];

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
    relatedSavedObjectWithRefs.push({
      ...relatedSavedObject,
      id: `related_${relatedSavedObject.type}_${index}`,
    });
    references.push({
      id: relatedSavedObject.id,
      name: `related_${relatedSavedObject.type}_${index}`,
      type: relatedSavedObject.type,
    });
  });

  return {
    references,
    ...(relatedSavedObjects ? { relatedSavedObjectWithRefs } : {}),
  };
}

export function injectSavedObjectReferences(
  references: SavedObjectReference[],
  relatedSavedObjects?: RelatedSavedObjects
): { actionId?: string; relatedSavedObjects?: SavedObjectAttribute } {
  references = references ?? [];

  // Look for for the action id
  const action = references.find((ref) => ref.name === ACTION_REF_NAME);

  const injectedRelatedSavedObjects = (relatedSavedObjects ?? []).flatMap((relatedSavedObject) => {
    const reference = references.find((ref) => ref.name === relatedSavedObject.id);

    // relatedSavedObjects are used only in the event log document that is written during
    // action execution. Because they are not critical to the actual execution of the action
    // we will not throw an error if no reference is found matching this related saved object
    return reference ? [{ ...relatedSavedObject, id: reference.id }] : [relatedSavedObject];
  });

  const result: { actionId?: string; relatedSavedObjects?: SavedObjectAttribute } = {};
  if (action) {
    result.actionId = action.id;
  }

  if (relatedSavedObjects) {
    result.relatedSavedObjects = injectedRelatedSavedObjects;
  }

  return result;
}
