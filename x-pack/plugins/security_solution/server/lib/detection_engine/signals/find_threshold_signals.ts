/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@elastic/safer-lodash-set';
import { isEmpty } from 'lodash/fp';

import {
  Threshold,
  TimestampOverrideOrUndefined,
} from '../../../../common/detection_engine/schemas/common/schemas';
import { singleSearchAfter } from './single_search_after';

import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
} from '../../../../../alerts/server';
import { Logger } from '../../../../../../../src/core/server';
import { SignalSearchResponse } from './types';
import { BuildRuleMessage } from './rule_messages';

interface FindThresholdSignalsParams {
  from: string;
  to: string;
  inputIndexPattern: string[];
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  logger: Logger;
  filter: unknown;
  threshold: Threshold;
  buildRuleMessage: BuildRuleMessage;
  timestampOverride: TimestampOverrideOrUndefined;
}

export const findThresholdSignals = async ({
  from,
  to,
  inputIndexPattern,
  services,
  logger,
  filter,
  threshold,
  buildRuleMessage,
  timestampOverride,
}: FindThresholdSignalsParams): Promise<{
  searchResult: SignalSearchResponse;
  searchDuration: string;
  searchErrors: string[];
}> => {
  const thresholdFields = Array.isArray(threshold.field) ? threshold.field : [threshold.field];

  const aggregations =
    threshold && !isEmpty(threshold.field)
      ? thresholdFields.reduce((acc, field, i) => {
          const aggPath = [...Array(i + 1).keys()]
            .map((j) => {
              return `['threshold_${j}:${thresholdFields[j]}']`;
            })
            .join(`['aggs']`);
          set(acc, aggPath, {
            terms: {
              field,
              min_doc_count: threshold.value, // not needed on parent agg, but can help narrow down result set
              size: 10000, // max 10k buckets
            },
          });
          if (i === threshold.field.length - 1) {
            const topHitsAgg = {
              top_hits: {
                sort: [
                  {
                    [timestampOverride ?? '@timestamp']: {
                      order: 'desc',
                    },
                  },
                ],
                fields: [
                  {
                    field: '*',
                    include_unmapped: true,
                  },
                ],
                size: 1,
              },
            };
            // TODO: support case where threshold fields are not supplied, but cardinality is?
            if (!isEmpty(threshold.cardinality_field)) {
              set(acc, `${aggPath}['aggs']`, {
                top_threshold_hits: topHitsAgg,
                cardinality_count: {
                  cardinality: {
                    field: threshold.cardinality_field,
                  },
                },
                cardinality_check: {
                  bucket_selector: {
                    buckets_path: {
                      cardinalityCount: 'cardinality_count',
                    },
                    script: `params.cardinalityCount >= ${threshold.cardinality_value}`, // TODO: cardinality operator
                  },
                },
              });
            } else {
              set(acc, `${aggPath}['aggs']`, {
                top_threshold_hits: topHitsAgg,
              });
            }
          }
          return acc;
        }, {})
      : {};

  return singleSearchAfter({
    aggregations,
    searchAfterSortId: undefined,
    timestampOverride,
    index: inputIndexPattern,
    from,
    to,
    services,
    logger,
    filter,
    pageSize: 1,
    sortOrder: 'desc',
    buildRuleMessage,
    excludeDocsWithTimestampOverride: false,
  });
};
