/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import type {
  QueryDslQueryContainer,
  AggregationsCardinalityAggregate,
  SearchResponseBody,
} from '@elastic/elasticsearch/lib/api/types';
import { useCancellableSearch } from '../../hooks/use_cancellable_search';
import { useDataSource } from '../../hooks/use_data_source';

/**
 * Gets the cardinality of the selected split field
 * @param splitField
 * @param query
 */
export function useSplitFieldCardinality(splitField: string, query: QueryDslQueryContainer) {
  const [cardinality, setCardinality] = useState<number>();
  const { dataView } = useDataSource();

  const requestPayload = useMemo(() => {
    return {
      params: {
        index: dataView.getIndexPattern(),
        size: 0,
        body: {
          query,
          aggregations: {
            fieldCount: {
              cardinality: {
                field: splitField,
              },
            },
          },
        },
      },
    };
  }, [splitField, dataView, query]);

  const { runRequest: getSplitFieldCardinality, cancelRequest } = useCancellableSearch();

  useEffect(
    function performCardinalityCheck() {
      cancelRequest();

      getSplitFieldCardinality<
        typeof requestPayload,
        {
          rawResponse: SearchResponseBody<
            unknown,
            { fieldCount: AggregationsCardinalityAggregate }
          >;
        }
      >(requestPayload).then((response) => {
        if (response?.rawResponse.aggregations) {
          setCardinality(response.rawResponse.aggregations.fieldCount.value);
        }
      });
    },
    [getSplitFieldCardinality, requestPayload, cancelRequest]
  );

  return cardinality;
}
