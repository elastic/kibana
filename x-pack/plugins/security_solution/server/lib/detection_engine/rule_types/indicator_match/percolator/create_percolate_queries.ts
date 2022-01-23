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
  threatMapping,
  threatList,
}: CreatePercolateQueriesOptions): PercolatorQuery[] => {
  const must = [{ match: { rule_id: ruleId } }, { match: { rule_version: ruleVersion } }];
  return threatList.reduce<PercolatorQuery[]>((queries, indicator) => {
    const query = threatMapping.reduce<PercolatorQuery[]>((clauses, threatMapItem) => {
      const filters = threatMapItem.entries.reduce<PercolatorQuery[]>((clauseParts, entry) => {
        const value = get(entry.value, indicator.fields);
        if (value != null && value.length === 1) {
          clauseParts.push({
            bool: {
              must,
              should: [
                {
                  match: {
                    [entry.field]: {
                      query: value[0],
                    },
                  },
                },
              ],
              minimum_should_match: 1,
            },
            _name: encodeThreatMatchNamedQuery({
              id: indicator._id,
              index: indicator._index,
              field: entry.field,
              value: entry.value,
            }),
            indicator,
          });
        }
        return clauseParts;
      }, []);
      if (filters.length === 1) {
        clauses.push({ ...filters[0] });
      } else if (filters.length > 1) {
        // for an AND threat mapping, the first _name is used for creating the threat.enrichments.matched* values
        clauses.push({
          bool: { filter: filters, must, minimum_should_match: filters.length },
          _name: filters[0]._name,
          indicator,
        });
      }
      return clauses;
    }, []);
    queries.push(...query);
    return queries;
  }, []);
};
