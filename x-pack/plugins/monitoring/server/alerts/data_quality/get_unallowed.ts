/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MsearchRequestItem } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';

import type { GetUnallowedFieldValuesInputs } from './types';
import { getMSearchRequestHeader } from './get_msearch_request_header';
import { getMSearchRequestBody } from './get_msearch_request_body';

export const getUnallowedFieldValues = async (
  esClient: ElasticsearchClient,
  items: GetUnallowedFieldValuesInputs
) => {
  const searches: MsearchRequestItem[] = items.reduce<MsearchRequestItem[]>(
    (acc, { indexName, indexFieldName, allowedValues, from, to }) =>
      acc.concat([
        getMSearchRequestHeader(indexName),
        getMSearchRequestBody({ indexFieldName, allowedValues, from, to }),
      ]),
    []
  );

  const { responses } = await esClient.msearch({
    searches,
  });

  return {
    responses: responses.map((resp, i) => ({ ...resp, indexName: items[i].indexName })),
  };
};
