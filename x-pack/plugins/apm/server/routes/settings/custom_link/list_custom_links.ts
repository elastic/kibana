/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  CustomLink,
  CustomLinkES,
} from '../../../../common/custom_link/custom_link_types';
import { Setup } from '../../../lib/helpers/setup_request';
import { fromESFormat } from './helper';
import { filterOptionsRt } from './custom_link_types';

export async function listCustomLinks({
  setup,
  filters = {},
}: {
  setup: Setup;
  filters?: t.TypeOf<typeof filterOptionsRt>;
}): Promise<CustomLink[]> {
  const { internalClient, indices } = setup;
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
    index: indices.apmCustomLinkIndex,
    size: 500,
    body: {
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
    },
  };
  const resp = await internalClient.search<CustomLinkES>(
    'list_custom_links',
    params
  );
  const customLinks = resp.hits.hits.map((item) =>
    fromESFormat({
      id: item._id,
      ...item._source,
    })
  );
  return customLinks;
}
