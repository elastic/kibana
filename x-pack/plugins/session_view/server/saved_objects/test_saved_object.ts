/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from 'src/core/server';
import { TEST_SAVED_OBJECT } from '../../common/constants';

export const testSavedObject: SavedObjectsType = {
  name: TEST_SAVED_OBJECT,
  hidden: false,
  namespaceType: 'agnostic',
  mappings: {
    properties: {
      name: { type: 'text' },
      value: { type: 'keyword' },
    },
  },
};
