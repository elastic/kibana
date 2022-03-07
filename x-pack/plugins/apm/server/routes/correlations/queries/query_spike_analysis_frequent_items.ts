/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient } from 'kibana/server';
import { CorrelationsParams } from '../../../../common/correlations/types';
import { FrequentItems } from '../../../../common/correlations/change_point/types';
import { getQueryWithParams } from './get_query_with_params';
import { getRequestBase } from './get_request_base';

export const getSpikeAnalysisFrequentItemsRequest = (
  params: CorrelationsParams,
  fieldCandidates: Array<{ fieldName: string; fieldValue: string | number }>
): estypes.SearchRequest => {
  const fieldNames = fieldCandidates.map(({ fieldName }) => fieldName);
  const query = getQueryWithParams({
    params,
  });

  query.bool.should = fieldCandidates.map((fc) => ({
    term: { [fc.fieldName]: fc.fieldValue },
  }));
  query.bool.minimum_should_match = 2;

  const body = {
    track_total_hits: true,
    query,
    size: 0,
    aggs: {
      fi: {
        frequent_items: {
          minimum_set_size: 2,
          fields: fieldNames.map((field) => ({ field })),
        },
      },
    },
  };

  return {
    ...getRequestBase(params),
    ...body,
  };
};

export const fetchSpikeAnalysisFrequentItems = async (
  esClient: ElasticsearchClient,
  params: CorrelationsParams,
  fieldCandidates: Array<{ fieldName: string; fieldValue: string | number }>
) => {
  const resp = await esClient.search<unknown, { fi: FrequentItems }>(
    getSpikeAnalysisFrequentItemsRequest(params, fieldCandidates)
  );
  console.log(
    'resp',
    (typeof resp?.hits?.total !== 'number' && resp?.hits?.total?.value) ?? 0
  );
  const totalDocCount =
    (typeof resp?.hits?.total !== 'number' && resp?.hits?.total?.value) ?? 0;

  if (resp.aggregations === undefined) {
    throw new Error(
      'fetchSpikeAnalysisFrequentItems failed, did not return aggregations.'
    );
  }

  const overallResult = resp.aggregations.fi;

  return { frequentItems: overallResult, totalDocCount };
};
