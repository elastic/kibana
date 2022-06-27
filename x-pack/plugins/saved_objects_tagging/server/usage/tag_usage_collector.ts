/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { TaggingUsageData } from './types';
import { fetchTagUsageData } from './fetch_tag_usage_data';
import { tagUsageCollectorSchema } from './schema';

export const createTagUsageCollector = ({
  usageCollection,
  kibanaIndex,
}: {
  usageCollection: UsageCollectionSetup;
  kibanaIndex: string;
}) => {
  return usageCollection.makeUsageCollector<TaggingUsageData>({
    type: 'saved_objects_tagging',
    isReady: () => true,
    schema: tagUsageCollectorSchema,
    fetch: ({ esClient }) => {
      return fetchTagUsageData({ esClient, kibanaIndex });
    },
  });
};
