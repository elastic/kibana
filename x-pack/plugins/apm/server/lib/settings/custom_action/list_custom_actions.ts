/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup } from '../../helpers/setup_request';
import { CustomAction } from './custom_action_types';

export async function listCustomActions({
  setup,
  filters = {}
}: {
  setup: Setup;
  filters: Record<string, string>;
}) {
  const { internalClient, indices } = setup;

  const esFilters = Object.entries(filters).map(([key, value]) => {
    const field = `filters.${key}`;
    return {
      bool: {
        minimum_should_match: 1,
        should: [
          { term: { [field]: value } },
          { bool: { must_not: [{ exists: { field } }] } }
        ]
      }
    };
  });

  const params = {
    index: indices.apmCustomActionIndex,
    size: 500,
    body: {
      query: {
        bool: {
          filter: esFilters
        }
      }
    }
  };
  const resp = await internalClient.search<CustomAction>(params);
  return resp.hits.hits.map(item => ({
    id: item._id,
    ...item._source
  }));
}
