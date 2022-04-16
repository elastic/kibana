/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@elastic/safer-lodash-set';
import _ from 'lodash';
import { SavedObject, SavedObjectReference, SavedObjectsUpdateResponse } from '@kbn/core/server';

interface Field {
  path: string;
  type: string;
  name: string;
}

/**
 * This class handles remove fields from an object and moving them into the saved object reference fields. It also
 * handles going the opposite direction to add fields back into an object by setting them to null or if a reference is
 * found setting them to the value defined in the reference.
 *
 * This population of the field is to avoid having to change the UI to look in the references field of saved objects
 * to find these values.
 */
export class FieldMigrator {
  constructor(private readonly fieldsToMigrate: Field[]) {}

  public extractFieldsToReferences<T>({
    data,
    existingReferences = [],
  }: {
    data: unknown;
    existingReferences?: SavedObjectReference[];
  }): { transformedFields: T; references: SavedObjectReference[] } {
    const copyOfData = _.cloneDeep(data);

    const references = createReferenceMap(existingReferences);

    for (const field of this.fieldsToMigrate) {
      const fieldValue = _.get(copyOfData, field.path);

      // the field is null, or if it is undefined and the path exists (undefined is the default return of _.get which is
      // why we need to distinguish if it is a valid path)
      if (fieldValue === null || (fieldValue === undefined && _.has(copyOfData, field.path))) {
        references.delete(field.name);
      } else if (fieldValue !== undefined) {
        references.set(field.name, { id: fieldValue, name: field.name, type: field.type });
      }

      // this will do nothing if the field wasn't present
      _.unset(copyOfData, field.path);
    }

    return { transformedFields: copyOfData as T, references: Array.from(references.values()) };
  }

  public populateFieldsFromReferences<T extends object>(data: SavedObject<T>): object {
    const dataToManipulate = _.cloneDeep(data);

    const references = createReferenceMap(data.references);

    for (const field of this.fieldsToMigrate) {
      const reference = references.get(field.name);

      if (reference) {
        set(dataToManipulate.attributes, field.path, reference.id);
      } else {
        set(dataToManipulate.attributes, field.path, null);
      }
    }

    return dataToManipulate;
  }

  public populateFieldsFromReferencesForPatch<T extends object>({
    dataBeforeRequest,
    dataReturnedFromRequest,
  }: {
    dataBeforeRequest: object;
    dataReturnedFromRequest: SavedObjectsUpdateResponse<T>;
  }): object {
    const dataToManipulate = _.cloneDeep(dataReturnedFromRequest);

    const references = createReferenceMap(dataReturnedFromRequest.references);

    for (const field of this.fieldsToMigrate) {
      const reference = references.get(field.name);

      const fieldValueBeforeRequest = _.get(dataBeforeRequest, field.path);
      if (fieldValueBeforeRequest !== undefined) {
        if (reference) {
          set(dataToManipulate.attributes, field.path, reference.id);
        } else {
          // set path to fieldValueBeforeRequest
          set(dataToManipulate.attributes, field.path, fieldValueBeforeRequest);
        }
      }
    }

    return dataToManipulate;
  }
}

function createReferenceMap(
  references: SavedObjectReference[] = []
): Map<string, SavedObjectReference> {
  return new Map<string, SavedObjectReference>(references.map((ref) => [ref.name, ref]));
}
