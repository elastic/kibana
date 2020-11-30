/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MakeSchemaFrom } from '../../../../../src/plugins/usage_collection/server';
import { TaggingUsageData, ByTypeTaggingUsageData } from './types';

const perTypeSchema: MakeSchemaFrom<ByTypeTaggingUsageData> = {
  usedTags: { type: 'integer' },
  taggedObjects: { type: 'integer' },
};

export const tagUsageCollectorSchema: MakeSchemaFrom<TaggingUsageData> = {
  usedTags: { type: 'integer' },
  taggedObjects: { type: 'integer' },

  types: {
    dashboard: perTypeSchema,
    visualization: perTypeSchema,
    map: perTypeSchema,
  },
};
