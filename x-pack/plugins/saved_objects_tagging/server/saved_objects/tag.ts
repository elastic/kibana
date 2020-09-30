/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsType } from 'src/core/server';
import { tagSavedObjectTypeName } from '../../common/constants';

export const tagType: SavedObjectsType = {
  name: tagSavedObjectTypeName,
  hidden: false,
  namespaceType: 'single',
  mappings: {
    properties: {
      title: {
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
    defaultSearchField: 'title',
    icon: 'tag',
    getTitle: (obj) => obj.attributes.title,
  },
};
