/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick } from 'lodash';
import {
  FilterOptions,
  FILTER_OPTIONS
} from '../../../../common/custom_link_filter_options';
import { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import { Setup } from '../../helpers/setup_request';

export async function getTransaction({
  setup,
  filters = {}
}: {
  setup: Setup;
  filters?: FilterOptions;
}) {
  const { client, indices } = setup;

  const esFilters = Object.entries(pick(filters, FILTER_OPTIONS)).map(
    ([key, value]) => {
      return { term: { [key]: value } };
    }
  );

  const params = {
    terminateAfter: 1,
    index: indices['apm_oss.transactionIndices'],
    size: 1,
    body: { query: { bool: { filter: esFilters } } }
  };
  const resp = await client.search<Transaction>(params);
  return resp.hits.hits[0]?._source;
}
