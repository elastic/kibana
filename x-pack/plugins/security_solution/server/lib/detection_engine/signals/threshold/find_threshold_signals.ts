/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@elastic/safer-lodash-set';

import {
  Threshold,
  TimestampOverrideOrUndefined,
} from '../../../../../common/detection_engine/schemas/common/schemas';
import { normalizeThresholdField } from '../../../../../common/detection_engine/utils';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
} from '../../../../../../alerts/server';
import { Logger } from '../../../../../../../../src/core/server';
import { BuildRuleMessage } from '../rule_messages';
import { singleSearchAfter } from '../single_search_after';
import { SignalSearchResponse } from '../types';

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
  const leafAggs = {
    top_threshold_hits: {
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
    },
    ...(threshold.cardinality?.length
      ? {
          cardinality_count: {
            cardinality: {
              field: threshold.cardinality[0].field,
            },
          },
          cardinality_check: {
            bucket_selector: {
              buckets_path: {
                cardinalityCount: 'cardinality_count',
              },
              script: `params.cardinalityCount >= ${threshold.cardinality[0].value}`, // TODO: cardinality operator
            },
          },
        }
      : {}),
  };

  const thresholdFields = normalizeThresholdField(threshold.field);

  const aggregations = thresholdFields.length
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
        if (i === (thresholdFields.length ?? 0) - 1) {
          set(acc, `${aggPath}['aggs']`, leafAggs);
        }
        return acc;
      }, {})
    : {
        // No threshold grouping fields provided
        threshold_0: {
          terms: {
            script: {
              source: '""', // Group everything in the same bucket
              lang: 'painless',
            },
            min_doc_count: threshold.value,
          },
          aggs: leafAggs,
        },
      };

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
