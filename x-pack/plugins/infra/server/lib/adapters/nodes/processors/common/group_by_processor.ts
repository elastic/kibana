/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep, set } from 'lodash';

import { InfraPathFilterInput, InfraPathInput } from '../../../../../../common/graphql/types';
import {
  InfraESQueryStringQuery,
  InfraESSearchBody,
  InfraProcesorRequestOptions,
} from '../../adapter_types';
import { isGroupByFilters, isGroupByTerms } from '../../lib/type_guards';

export const groupByProcessor = (options: InfraProcesorRequestOptions) => {
  return (doc: InfraESSearchBody) => {
    const result = cloneDeep(doc);
    const { groupBy } = options.nodeOptions;
    let aggs = {};
    set(result, 'aggs.waffle.aggs.nodes.aggs', aggs);
    groupBy.forEach((grouping: InfraPathInput, index: number) => {
      if (isGroupByTerms(grouping)) {
        const termsAgg = {
          aggs: {},
          terms: {
            field: grouping.field,
            size: 10,
          },
        };
        set(aggs, `path_${index}`, termsAgg);
        aggs = termsAgg.aggs;
      }

      if (grouping && isGroupByFilters(grouping)) {
        const filtersAgg = {
          aggs: {},
          filters: {
            filters: grouping.filters!.map(
              (filter: InfraPathFilterInput): InfraESQueryStringQuery => {
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
    return result;
  };
};
