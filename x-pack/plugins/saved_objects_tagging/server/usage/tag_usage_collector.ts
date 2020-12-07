/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { SharedGlobalConfig } from 'src/core/server';
import { UsageCollectionSetup } from '../../../../../src/plugins/usage_collection/server';
import { TaggingUsageData } from './types';
import { fetchTagUsageData } from './fetch_tag_usage_data';
import { tagUsageCollectorSchema } from './schema';

export const createTagUsageCollector = ({
  usageCollection,
  legacyConfig$,
}: {
  usageCollection: UsageCollectionSetup;
  legacyConfig$: Observable<SharedGlobalConfig>;
}) => {
  return usageCollection.makeUsageCollector<TaggingUsageData>({
    type: 'saved_objects_tagging',
    isReady: () => true,
    schema: tagUsageCollectorSchema,
    fetch: async ({ esClient }) => {
      const { kibana } = await legacyConfig$.pipe(take(1)).toPromise();
      return fetchTagUsageData({ esClient, kibanaIndex: kibana.index });
    },
  });
};
