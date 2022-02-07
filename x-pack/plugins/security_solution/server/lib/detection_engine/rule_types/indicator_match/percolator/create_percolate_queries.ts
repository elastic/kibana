/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import get from 'lodash/fp/get';
import {
  CreatePercolateQueriesOptions,
  PercolatorQuery,
} from '../../../signals/threat_mapping/types';
import { encodeThreatMatchNamedQuery } from '../../../signals/threat_mapping/utils';

export const createPercolateQueries = ({
  ruleId,
  ruleVersion,
  threatMapping: orItemsWithAndSubItems,
  threatList,
}: CreatePercolateQueriesOptions): PercolatorQuery[] => {
  const must = [{ match: { rule_id: ruleId } }, { match: { rule_version: ruleVersion } }];

  return threatList.reduce<PercolatorQuery[]>((allQueries, indicator) => {
    const { fields, ...indicatorWithoutFields } = indicator;

    const queriesFromOneIndicator = orItemsWithAndSubItems.reduce<PercolatorQuery[]>(
      (orQueries, orItem) => {
        const andItems = orItem.entries;

        const isIndicatorMatchingAndItems = andItems.every((andItem) => {
          const val = get(andItem.value, fields);
          return val != null && val.length === 1;
        });

        if (isIndicatorMatchingAndItems) {
          const andQuery = andItems.reduce<PercolatorQuery>(
            (percolatorQuery, andItem) => ({
              bool: {
                ...percolatorQuery.bool,
                should: [
                  ...percolatorQuery.bool.should,
                  {
                    match: {
                      [andItem.field]: {
                        query: get(andItem.value, fields)[0],
                      },
                    },
                    _name: encodeThreatMatchNamedQuery({
                      id: indicator._id,
                      index: indicator._index,
                      field: andItem.field,
                      value: andItem.value,
                    }),
                  },
                ],
                minimum_should_match: percolatorQuery.bool.minimum_should_match + 1,
              },
            }),
            {
              bool: {
                must,
                should: [],
                minimum_should_match: 0,
              },
            }
          );
          orQueries.push({
            ...andQuery,
            indicator: {
              ...indicatorWithoutFields,
            },
          });
        }
        return orQueries;
      },
      []
    );
    allQueries.push(...queriesFromOneIndicator);
    return allQueries;
  }, []);
};
