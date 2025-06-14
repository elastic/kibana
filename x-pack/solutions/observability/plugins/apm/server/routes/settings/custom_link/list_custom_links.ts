/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as t from 'io-ts';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { APM_CUSTOM_LINK_INDEX } from '@kbn/apm-sources-access-plugin/server';
import type { CustomLink, CustomLinkES } from '../../../../common/custom_link/custom_link_types';
import { fromESFormat } from './helper';
import type { filterOptionsRt } from './custom_link_types';
import type { APMInternalESClient } from '../../../lib/helpers/create_es_client/create_internal_es_client';

export async function listCustomLinks({
  internalESClient,
  filters = {},
}: {
  internalESClient: APMInternalESClient;
  filters?: t.TypeOf<typeof filterOptionsRt>;
}): Promise<CustomLink[]> {
  const esFilters = Object.entries(filters).map(([key, value]) => {
    return {
      bool: {
        minimum_should_match: 1,
        should: [
          { term: { [key]: value } },
          { bool: { must_not: [{ exists: { field: key } }] } },
        ] as QueryDslQueryContainer[],
      },
    };
  });

  const params = {
    index: APM_CUSTOM_LINK_INDEX,
    size: 500,
    query: {
      bool: {
        filter: esFilters,
      },
    },
    sort: [
      {
        'label.keyword': {
          order: 'asc' as const,
        },
      },
    ],
  };
  const resp = await internalESClient.search<CustomLinkES>('list_custom_links', params);
  const customLinks = resp.hits.hits.map((item) =>
    fromESFormat({
      id: item._id,
      ...item._source,
    })
  );
  return customLinks;
}
