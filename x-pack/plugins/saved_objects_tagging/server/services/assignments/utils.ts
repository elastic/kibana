/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { SavedObject, SavedObjectsType } from 'kibana/server';
import { AssignableObject } from '../../../common/assignments';
import { tagSavedObjectTypeName } from '../../../common';

export const toAssignableObject = (
  object: SavedObject,
  typeDef: SavedObjectsType
): AssignableObject => {
  return {
    id: object.id,
    type: object.type,
    title: typeDef.management?.getTitle ? typeDef.management.getTitle(object) : object.id,
    icon: typeDef.management?.icon,
    tags: object.references
      .filter(({ type }) => type === tagSavedObjectTypeName)
      .map(({ id }) => id),
  };
};
