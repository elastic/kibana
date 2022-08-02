/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
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
    lens: perTypeSchema,
    visualization: perTypeSchema,
    map: perTypeSchema,
  },
};
