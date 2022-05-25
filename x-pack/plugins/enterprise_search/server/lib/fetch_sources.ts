/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { ContentSourceDetails } from '../../common/types/sources';

import { isNotNullish } from '../../common/utils/is_not_nullish';

interface SourceResult {
  id: string;
  created_at: string;
  updated_at: string;
  key: string | null;
  last_indexed_at: string | null;
  name: string;
  service_type: string;
  configuration: null;
  connection_status: null;
  created_for_curated_data: null;
  service_account: {};
  search_result_config: null;
  main_icon: null;
  alt_icon: null;
  indexing: {
    default_action: string;
    rules: [];
    schedule: {
      intervals: [];
      blocked: [];
    };
    enabled: true;
    features: {
      content_extraction: {
        enabled: true;
      };
      thumbnails: {
        enabled: true;
      };
    };
  };
  facets: {
    overrides: [];
  };
  triggers: {
    overrides: [];
  };
  base_service_type: null;
}

interface ISourcesServerResponse {
  contentSources: ContentSourceDetails[];
  // privateContentSources?: ContentSourceDetails[];
  // serviceTypes: Connector[];
}

// This actually gets all sources, not just custom ones. I'm sure some stuff won't work for non-custom ones at this point though.

export const fetchSources = async (
  client: IScopedClusterClient
): Promise<ISourcesServerResponse> => {
  const index = '.ent-search-actastic-workplace_search_content_sources_v23';
  try {
    const response = await client.asCurrentUser.search<SourceResult>({
      index,
    });
    const documentCounts = new Map<string, number>();
    for (const doc of response.hits.hits) {
      if (doc._source) {
        const { id } = doc._source;
        const documentCount = await client.asCurrentUser.count({
          index: `.ent-search-engine-documents-custom-${id}`,
        });
        documentCounts.set(id, documentCount.count);
      }
    }

    const contentSources = response.hits.hits
      .map(({ _source }) => _source)
      .filter(isNotNullish)
      .map((doc) => {
        return {
          name: doc.name,
          id: doc.id,
          serviceType: doc.service_type,
          createdAt: doc.created_at,
          updatedAt: doc.updated_at,
          mainIcon: doc.main_icon ?? undefined,
          altIcon: doc.alt_icon ?? undefined,
          // this is the actual backend logic for custom sources, for non-custom it's more complicated
          status: doc.last_indexed_at ? 'Additional configuration required' : 'Synced',
          statusMessage: 'message',
          documentCount: `${documentCounts.get(doc.id) ?? 0}`,
          isFederatedSource: false,
          errorReason: 'nah',
          searchable: true,
          supportedByLicense: true,
          allowsReauth: false,
          boost: 0,
          activities: [],
          isOauth1: false,
        };
      });

    return { contentSources };
  } catch (err) {
    return err;
  }
};
