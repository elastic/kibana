/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimestampOverrideOrUndefined } from '../../../../common/detection_engine/schemas/common/schemas';
import { singleSearchAfter } from './single_search_after';

import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
} from '../../../../../alerts/server';
import { Logger } from '../../../../../../../src/core/server';
import { SignalSearchResponse } from './types';
import { BuildRuleMessage } from './rule_messages';

interface FindPreviousThresholdSignalsParams {
  from: string;
  to: string;
  indexPattern: string[];
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  logger: Logger;
  ruleId: string;
  bucketByField: string;
  timestampOverride: TimestampOverrideOrUndefined;
  buildRuleMessage: BuildRuleMessage;
}

export const findPreviousThresholdSignals = async ({
  from,
  to,
  indexPattern,
  services,
  logger,
  ruleId,
  bucketByField,
  timestampOverride,
  buildRuleMessage,
}: FindPreviousThresholdSignalsParams): Promise<{
  searchResult: SignalSearchResponse;
  searchDuration: string;
  searchErrors: string[];
}> => {
  const aggregations = {
    threshold: {
      terms: {
        field: 'signal.threshold_result.value',
      },
      aggs: {
        lastSignalTimestamp: {
          max: {
            field: 'signal.original_time', // timestamp of last event captured by bucket
          },
        },
      },
    },
  };

  const filter = {
    bool: {
      must: [
        {
          term: {
            'signal.rule.rule_id': ruleId,
          },
        },
        {
          term: {
            'signal.rule.threshold.field': bucketByField,
          },
        },
      ],
    },
  };

  return singleSearchAfter({
    aggregations,
    searchAfterSortId: undefined,
    timestampOverride,
    index: indexPattern,
    from,
    to,
    services,
    logger,
    filter,
    pageSize: 0,
    buildRuleMessage,
    excludeDocsWithTimestampOverride: false,
  });
};
