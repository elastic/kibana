/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup } from '../../helpers/setup_request';
import { CustomLink } from './custom_link_types';
import { FilterOptionsType } from '../../../routes/settings/custom_link';

export async function listCustomLinks({
  setup,
  filters = {}
}: {
  setup: Setup;
  filters?: FilterOptionsType;
}) {
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
      }
    }
  };
  const resp = await internalClient.search<CustomLink>(params);
  return resp.hits.hits.map(item => ({
    id: item._id,
    ...item._source
  }));
}
