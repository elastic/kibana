/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep, set } from 'lodash';
import { InfraGroupBy, InfraGroupByFilter } from '../../../../common/types';
import {
  InfraESQueryStringQuery,
  InfraESSearchBody,
  InfraProcesorRequestOptions,
  InfraProcessor,
  InfraProcessorChainFn,
  InfraProcessorTransformer,
} from '../../infra_types';

import { isGroupByFilters, isGroupByTerms } from '../../../../common/type_guards';

export const groupByProcessor: InfraProcessor<InfraProcesorRequestOptions, InfraESSearchBody> = (
  options: InfraProcesorRequestOptions
): InfraProcessorChainFn<InfraESSearchBody> => {
  return (next: InfraProcessorTransformer<InfraESSearchBody>) => (doc: InfraESSearchBody) => {
    const result = cloneDeep(doc);
    const { groupBy } = options.nodeOptions;
    let aggs = {};
    set(result, 'aggs.waffle.aggs.nodes.aggs', aggs);
    groupBy.forEach((grouping: InfraGroupBy) => {
      if (isGroupByTerms(grouping)) {
        const termsAgg = {
          aggs: {},
          terms: {
            field: grouping.field,
            size: 10,
          },
        };
        set(aggs, `${grouping.id}`, termsAgg);
        aggs = termsAgg.aggs;
      }

      if (grouping && isGroupByFilters(grouping)) {
        const filtersAgg = {
          aggs: {},
          filters: {
            filters: grouping.filters!.map(
              (filter: InfraGroupByFilter): InfraESQueryStringQuery => {
                return {
                  query_string: {
                    analyze_wildcard: true,
                    query: (filter && filter.query) || '*',
                  },
                };
              }
            ),
          },
        };
        set(aggs, `${grouping.id}`, filtersAgg);
        aggs = filtersAgg.aggs;
      }
    });
    return next(result);
  };
};
