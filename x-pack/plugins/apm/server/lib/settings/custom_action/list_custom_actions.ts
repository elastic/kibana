/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import {
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
  SERVICE_ENVIRONMENT
} from '../../../../common/elasticsearch_fieldnames';
import { Setup } from '../../helpers/setup_request';
import { CustomAction } from './custom_action_types';

export const FilterOptions = t.partial({
  [SERVICE_NAME]: t.string,
  [SERVICE_ENVIRONMENT]: t.string,
  [TRANSACTION_NAME]: t.string,
  [TRANSACTION_TYPE]: t.string
});

export type FilterOptionsType = t.TypeOf<typeof FilterOptions>;

export async function listCustomActions({
  setup,
  filters = {}
}: {
  setup: Setup;
  filters?: FilterOptionsType;
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
