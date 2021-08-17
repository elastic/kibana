/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { SavedObjectAttribute, SavedObjectReference } from 'src/core/server/types';
import { RelatedSavedObjectRef, RelatedSavedObjects } from './related_saved_objects';

export const ACTION_REF_NAME = `actionRef`;

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

export function injectSavedObjectReferences(
  references: SavedObjectReference[],
  relatedSavedObjectRefs?: RelatedSavedObjectRef[]
): { actionId?: string; relatedSavedObjects?: SavedObjectAttribute } {
  references = references ?? [];

  // Look for for the action id
  const action = references.find((ref) => ref.name === ACTION_REF_NAME);

  const relatedSavedObjects = (relatedSavedObjectRefs ?? []).flatMap((relatedSavedObjectRef) => {
    const reference = references.find((ref) => ref.name === relatedSavedObjectRef.ref);

    // These are used to provide context in the event log so we will not throw an error
    // if it is not found because we don't want to block the action execution
    return reference ? [{ ...omit(relatedSavedObjectRef, 'ref'), id: reference.id }] : [];
  });

  return {
    ...(action ? { actionId: action.id } : {}),
    ...(relatedSavedObjectRefs ? { relatedSavedObjects } : {}),
  };
}
