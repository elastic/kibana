/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from 'kibana/server';
import _ from 'lodash';

interface Field {
  path: string;
  type: string;
  name: string;
}

export class FieldMigrator {
  constructor(private readonly fieldsToMigrate: Field[]) {}

  public extractFieldsToReferences(
    data: unknown,
    existingReferences: SavedObjectReference[]
  ): { transformedFields: unknown; references: SavedObjectReference[] } {
    const copyOfData = _.cloneDeep(data);

    // TODO: transform existingReferences into a map so it can be managed more easily
    const references: SavedObjectReference[] = [];

    for (const field of this.fieldsToMigrate) {
      const fieldValue = _.get(copyOfData, field.path);

      if (fieldValue === undefined) {
        // do nothing the field wasn't present
      } else if (fieldValue === null) {
        // we need to remove the field and remove it from the references
      }
    }
  }
}
