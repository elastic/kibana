/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from 'kibana/server';
import { NONE_CONNECTOR_ID } from '../../common/api';

interface Reference {
  soReference?: SavedObjectReference;
  name: string;
}

export class ConnectorReferenceHandler {
  private newReferences: Reference[] = [];

  constructor(references: Array<{ id?: string | null; name: string; type: string }>) {
    for (const { id, name, type } of references) {
      // When id is null, or the none connector we'll try to remove the reference if it exists
      // When id is undefined it means that we're doing a patch request and this particular field shouldn't be updated
      // so we'll ignore it. If it was already in the reference array then it'll stay there when we merge them together below
      if (id === null || id === NONE_CONNECTOR_ID) {
        this.newReferences.push({ name });
      } else if (id) {
        this.newReferences.push({ soReference: { id, name, type }, name });
      }
    }
  }

  /**
   * Merges the references passed to the constructor into the original references passed into this function
   *
   * @param originalReferences existing saved object references
   * @returns a merged reference list or undefined when there are no new or existing references
   */
  public build(originalReferences?: SavedObjectReference[]): SavedObjectReference[] | undefined {
    if (this.newReferences.length <= 0) {
      return originalReferences;
    }

    const refMap = new Map<string, SavedObjectReference>(
      originalReferences?.map((ref) => [ref.name, ref])
    );

    for (const newRef of this.newReferences) {
      if (newRef.soReference) {
        refMap.set(newRef.name, newRef.soReference);
      } else {
        refMap.delete(newRef.name);
      }
    }

    return Array.from(refMap.values());
  }
}
