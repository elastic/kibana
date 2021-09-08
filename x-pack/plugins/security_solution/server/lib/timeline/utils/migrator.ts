/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@elastic/safer-lodash-set';
import _ from 'lodash';
import { SavedObject, SavedObjectReference } from 'kibana/server';

interface Field {
  path: string;
  type: string;
  name: string;
}
export class FieldMigrator {
  constructor(private readonly fieldsToMigrate: Field[]) {}

  public extractFieldsToReferences({
    data,
    existingReferences = [],
  }: {
    data: unknown;
    existingReferences?: SavedObjectReference[];
  }): { transformedFields: unknown; references: SavedObjectReference[] } {
    const copyOfData = _.cloneDeep(data);

    const references = createReferenceMap(existingReferences);

    for (const field of this.fieldsToMigrate) {
      const fieldValue = _.get(copyOfData, field.path);

      // this will do nothing if the field wasn't present
      _.unset(copyOfData, field.path);

      // the field is null, or if it is undefined and the path exists (undefined is the default return of _.get which is
      // why we need to distinguish if it is a valid path)
      if (fieldValue === null || (fieldValue === undefined && _.has(copyOfData, field.path))) {
        references.delete(field.name);
      } else if (fieldValue !== undefined) {
        references.set(field.name, { id: fieldValue, name: field.name, type: field.type });
      }
    }

    return { transformedFields: copyOfData, references: Array.from(references.values()) };
  }

  public populateFieldsFromReferences(data: SavedObject): object {
    const dataToManipulate = _.cloneDeep(data);

    const references = createReferenceMap(data.references);

    for (const field of this.fieldsToMigrate) {
      const reference = references.get(field.name);

      if (reference) {
        set(dataToManipulate, field.path, reference.id);
      } else {
        set(dataToManipulate, field.path, null);
      }
    }

    return dataToManipulate;
  }

  public populateFieldsFromReferencesForPatch({
    dataBeforeRequest,
    dataReturnedFromRequest,
  }: {
    dataBeforeRequest: object;
    dataReturnedFromRequest: SavedObject;
  }): object {
    const dataToManipulate = _.cloneDeep(dataReturnedFromRequest);

    const references = createReferenceMap(dataReturnedFromRequest.references);

    for (const field of this.fieldsToMigrate) {
      const reference = references.get(field.name);

      const fieldValueBeforeRequest = _.get(dataBeforeRequest, field.path);
      if (fieldValueBeforeRequest !== undefined) {
        if (reference) {
          set(dataToManipulate, field.path, reference.id);
        } else {
          // set path to fieldValueBeforeRequest
          set(dataToManipulate, field.path, fieldValueBeforeRequest);
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
