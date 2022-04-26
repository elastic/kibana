/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '@kbn/core/server';

import { usageMetricSavedObjectType } from '../../../common/types';

export const usageMetricSavedObjectMappings: SavedObjectsType['mappings'] = {
  properties: {
    count: {
      type: 'long',
    },
    errors: {
      type: 'long',
    },
  },
};

export const usageMetricType: SavedObjectsType = {
  name: usageMetricSavedObjectType,
  hidden: false,
  namespaceType: 'agnostic',
  mappings: usageMetricSavedObjectMappings,
};
