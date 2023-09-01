/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import type { ESFilter } from '@kbn/es-types';

interface EsqlRuleState {
  lastDocumentTimestamp: string;
  query: string;
}

type GetHistoryFilter = (params: {
  ruleState?: Partial<EsqlRuleState>;
  ruleQuery: string;
}) => Filter[];

export const getHistoryFilter: GetHistoryFilter = ({ ruleState, ruleQuery }) => {
  if (ruleQuery !== ruleState?.query || !ruleState?.lastDocumentTimestamp) {
    return [];
  }

  const filter = {
    bool: {
      filter: [
        {
          range: {
            '@timestamp': {
              lte: ruleState.lastDocumentTimestamp,
            },
          },
        },
      ],
    },
  } as ESFilter;

  return [
    {
      bool: {
        must_not: [filter],
      },
      meta: {},
    },
  ];
};
