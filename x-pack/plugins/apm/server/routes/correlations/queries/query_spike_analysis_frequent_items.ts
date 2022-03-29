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
  fieldCandidates: Array<{ fieldName: string; fieldValue: string | number }>,
  windowParameters: {
    baselineMin: number;
    baselineMax: number;
    deviationMin: number;
    deviationMax: number;
  }
): estypes.SearchRequest => {
  const fieldNames = [
    ...new Set(fieldCandidates.map(({ fieldName }) => fieldName)),
  ];

  const query = getQueryWithParams({
    params,
  });

  const timestampField = params.timestampField ?? '@timestamp';

  if (Array.isArray(query.bool.filter)) {
    const filters = query.bool.filter.filter(
      (d) => Object.keys(d)[0] !== 'range'
    );

    query.bool.filter = [
      ...filters,
      {
        range: {
          [timestampField]: {
            gte: windowParameters.deviationMin,
            lt: windowParameters.deviationMax,
            format: 'epoch_millis',
          },
        },
      },
    ];
  }

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
          size: 1000,
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
  fieldCandidates: Array<{ fieldName: string; fieldValue: string | number }>,
  windowParameters: {
    baselineMin: number;
    baselineMax: number;
    deviationMin: number;
    deviationMax: number;
  }
) => {
  const req = getSpikeAnalysisFrequentItemsRequest(
    params,
    fieldCandidates,
    windowParameters
  );

  const resp = await esClient.search<unknown, { fi: FrequentItems }>(req, {
    maxRetries: 0,
  });
  const totalDocCount =
    (typeof resp?.hits?.total !== 'number' && resp?.hits?.total?.value) ?? 0;

  if (resp.aggregations === undefined) {
    throw new Error(
      'fetchSpikeAnalysisFrequentItems failed, did not return aggregations.'
    );
  }

  return { frequentItems: resp.aggregations.fi, totalDocCount };
};
