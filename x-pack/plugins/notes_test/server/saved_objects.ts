/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsServiceSetup, SavedObjectsType } from 'src/core/server';
import type { NoteAttributes } from '../common';
import { NOTE_OBJ_TYPE } from '../common';

export function registerSavedObject(savedObjects: SavedObjectsServiceSetup) {
  savedObjects.registerType(noteSavedObjectType);
}

const noteSavedObjectType: SavedObjectsType<NoteAttributes> = {
  name: NOTE_OBJ_TYPE,
  hidden: false,
  management: {
    importableAndExportable: true,
    icon: 'document',
    getTitle: ({ attributes }) => attributes.subject,
  },
  mappings: { dynamic: false, properties: {} },
  namespaceType: 'single',
};
