/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import get from 'lodash/fp/get';
import {
  CreatePercolateQueriesOptions,
  PercolatorQuery,
} from '../../../signals/threat_mapping/types';
import { ENRICHMENT_TYPES } from '../../../../../../common/cti/constants';

export const createThreatQueries = ({
  ruleId,
  ruleVersion,
  threatMapping: orItemsWithAndSubItems,
  threatList,
  threatIndicatorPath,
}: CreatePercolateQueriesOptions): PercolatorQuery[] => {
  const must = [{ match: { rule_id: ruleId } }, { match: { rule_version: ruleVersion } }];

  return threatList.reduce<PercolatorQuery[]>((allQueries, indicator) => {
    const queriesFromOneIndicator = orItemsWithAndSubItems.reduce<PercolatorQuery[]>(
      (orQueries, orItem) => {
        const andItems = orItem.entries;

        const isIndicatorMatchingAndItems = andItems.every((andItem) => {
          const val = get(andItem.value, indicator.fields);
          return val != null && val.length === 1;
        });

        if (isIndicatorMatchingAndItems) {
          const orQuery = andItems.reduce<PercolatorQuery>(
            (percolatorQuery, andItem) => {
              const atomic = get(andItem.value, indicator.fields)[0];
              return {
                bool: {
                  ...percolatorQuery.bool,
                  should: [
                    ...percolatorQuery.bool.should,
                    {
                      match: {
                        [andItem.field]: {
                          query: atomic,
                        },
                      },
                    },
                  ],
                  minimum_should_match: percolatorQuery.bool.minimum_should_match + 1,
                },
                enrichments: [
                  ...(percolatorQuery.enrichments ?? []),
                  {
                    matched: {
                      id: indicator._id,
                      index: indicator._index,
                      atomic,
                      field: andItem.field,
                      type: ENRICHMENT_TYPES.IndicatorMatchRule,
                    },
                    indicator: get(threatIndicatorPath, indicator._source),
                    feed: {
                      name: indicator._source?.threat?.feed?.name ?? '',
                    },
                  },
                ],
                id: `${percolatorQuery.id}_${andItem.field}_${atomic}`,
              };
            },
            {
              bool: {
                must,
                should: [],
                minimum_should_match: 0,
              },
              enrichments: [],
              id: `${indicator._id}_${indicator._index}`,
            }
          );
          orQueries.push(orQuery);
        }
        return orQueries;
      },
      []
    );
    allQueries.push(...queriesFromOneIndicator);
    return allQueries.map((query) => ({
      ...query,
      id: createHash('sha256')
        .update(query.id ?? '')
        .digest('hex'),
    }));
  }, []);
};
