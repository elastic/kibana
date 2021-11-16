/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from 'src/core/server';
import { MATRIX_HISTOGRAM_TEMPLATE_TYPE } from '../../common/constants';

export const matrixHistogramTemplateType: SavedObjectsType = {
  name: MATRIX_HISTOGRAM_TEMPLATE_TYPE,
  hidden: false,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {
      description: { type: 'text' },
      kibanaSavedObjectMeta: {
        properties: { searchSourceJSON: { type: 'text', index: false } },
      },
      savedSearchRefName: { type: 'keyword', index: false, doc_values: false },
      title: { type: 'text' },
      uiStateJSON: { type: 'text', index: false },
      version: { type: 'integer' },
      visState: { type: 'text', index: false },
    },
  },
  migrations: {},
  management: {
    importableAndExportable: false,
    icon: 'securitySolutionApp',
    defaultSearchField: 'title',
    getTitle(obj) {
      return obj.attributes.name;
    },
  },
};
