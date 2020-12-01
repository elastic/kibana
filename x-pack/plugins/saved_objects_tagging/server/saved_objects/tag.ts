/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectsType } from 'src/core/server';
import { tagSavedObjectTypeName, TagAttributes } from '../../common';

export const tagType: SavedObjectsType = {
  name: tagSavedObjectTypeName,
  hidden: false,
  namespaceType: 'single',
  mappings: {
    properties: {
      name: {
        type: 'text',
      },
      description: {
        type: 'text',
      },
      color: {
        type: 'text',
      },
    },
  },
  management: {
    importableAndExportable: true,
    defaultSearchField: 'name',
    icon: 'tag',
    getTitle: (obj: SavedObject<TagAttributes>) => obj.attributes.name,
  },
};
