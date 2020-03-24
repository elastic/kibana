/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { Setup } from '../../helpers/setup_request';
import { CustomLink, convertTo } from './custom_link_types';
import { CustomLinkES } from './create_custom_link_index';
import { FilterOptionsRt } from '../../../routes/settings/custom_link';

export async function listCustomLinks({
  setup,
  filters = {}
}: {
  setup: Setup;
  filters?: t.TypeOf<typeof FilterOptionsRt>;
}): Promise<CustomLink[]> {
  const { internalClient, indices } = setup;
  const esFilters = Object.entries(filters).map(([key, value]) => {
    return {
      bool: {
        minimum_should_match: 1,
        should: [
          { term: { [key]: value } },
          { bool: { must_not: [{ exists: { field: key } }] } }
        ]
      }
    };
  });

  const params = {
    index: indices.apmCustomLinkIndex,
    size: 500,
    body: {
      query: {
        bool: {
          filter: esFilters
        }
      },
      sort: [
        {
          'label.keyword': {
            order: 'asc'
          }
        }
      ]
    }
  };
  const resp = await internalClient.search<CustomLinkES>(params);
  const customLinks = convertTo(
    resp.hits.hits.map(item => ({
      id: item._id,
      ...item._source
    }))
  );
  return customLinks;
}
