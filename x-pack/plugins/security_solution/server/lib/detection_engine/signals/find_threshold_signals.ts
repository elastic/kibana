/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
  // TODO: reuse logic from signal_rule_alert_type
  const thresholdFields = Array.isArray(threshold.field) ? threshold.field : [threshold.field];

  const aggregations =
    threshold && !isEmpty(threshold.field)
      ? thresholdFields.map((field, idx) => {
          return {
            [`threshold_${idx}`]: {
              terms: {
                field,
                min_doc_count: threshold.value,
                // TODO: is size needed on outer aggs?
                size: 10000, // max 10k buckets
              },
              aggs:
                idx === threshold.field.length - 1
                  ? {
                      // Get the most recent hit per inner-most bucket
                      top_threshold_hits: {
                        top_hits: {
                          sort: [
                            {
                              [timestampOverride ?? '@timestamp']: {
                                order: 'desc',
                              },
                            },
                          ],
                          size: 1,
                        },
                      },
                      // TODO: cardinality aggs
                    }
                  : {},
            },
          };
        })
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
