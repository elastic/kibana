/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

import type { RunOpts, SearchAfterAndBulkCreateReturnType, WrapHits } from '../../types';
import type { UnifiedQueryRuleParams } from '../../../rule_schema';

import type { SingleSearchAfterParams } from '../../utils/single_search_after';
import { singleSearchAfter } from '../../utils/single_search_after';
import type { BuildReasonMessage } from '../../utils/reason_formatters';

type GetUnsuppressedAlerts = (params: {
  runOpts: RunOpts<UnifiedQueryRuleParams>;
  size: number;
  searchParams: SingleSearchAfterParams;
  groupByFields: string[];
  buildReasonMessage: BuildReasonMessage;
  toReturn: SearchAfterAndBulkCreateReturnType;
  suppressOnMissingFields: boolean;
}) => Promise<ReturnType<WrapHits>>;

/**
 * searches for documents with missing fields, to prepare alerts that will be created as unsuppressed query alerts
 * @param param0
 * @returns
 */
export const getUnsuppressedAlerts: GetUnsuppressedAlerts = async ({
  size,
  searchParams,
  groupByFields,
  buildReasonMessage,
  runOpts,
  toReturn,
  suppressOnMissingFields,
}) => {
  // if size is not positive or suppression is ON, we return empty results
  if (size <= 0 || suppressOnMissingFields === true) {
    return [];
  }

  const { searchResult } = await singleSearchAfter({
    ...searchParams,
    additionalFilters: [
      ...(searchParams.additionalFilters || []),
      ...buildMissingFieldsFilter(groupByFields),
    ],
    pageSize: size,
  });

  const events = searchResult.hits.hits;
  const wrappedDocs = runOpts.wrapHits(events, buildReasonMessage);

  return wrappedDocs;
};

/**
 * builds filter that returns only docs with at least one missing field from a list of groupByFields fields
 * @param groupByFields
 * @returns - Array<{@link QueryDslQueryContainer}>
 */
const buildMissingFieldsFilter = (groupByFields: string[]): QueryDslQueryContainer[] => {
  if (groupByFields.length === 0) {
    return [];
  }

  return [
    {
      bool: {
        should: groupByFields.map((field) => ({
          bool: {
            must_not: [
              {
                exists: {
                  field,
                },
              },
            ],
          },
        })),
      },
    },
  ];
};
