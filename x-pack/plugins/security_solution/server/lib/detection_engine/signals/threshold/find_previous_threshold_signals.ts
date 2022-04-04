/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimestampOverrideOrUndefined } from '../../../../../common/detection_engine/schemas/common/schemas';
import {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '../../../../../../alerting/server';
import { Logger } from '../../../../../../../../src/core/server';
import { BuildRuleMessage } from '../rule_messages';
import { singleSearchAfter } from '../single_search_after';
import { SignalSearchResponse } from '../types';

interface FindPreviousThresholdSignalsParams {
  from: string;
  to: string;
  indexPattern: string[];
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  logger: Logger;
  ruleId: string;
  bucketByFields: string[];
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
  bucketByFields,
  timestampOverride,
  buildRuleMessage,
}: FindPreviousThresholdSignalsParams): Promise<{
  searchResult: SignalSearchResponse;
  searchDuration: string;
  searchErrors: string[];
}> => {
  const filter = {
    bool: {
      must: [
        {
          term: {
            'signal.rule.rule_id': ruleId,
          },
        },
        // We might find a signal that was generated on the interval for old data... make sure to exclude those.
        {
          range: {
            'signal.original_time': {
              gte: from,
            },
          },
        },
        ...bucketByFields.map((field) => {
          return {
            term: {
              'signal.rule.threshold.field': field,
            },
          };
        }),
      ],
    },
  };

  return singleSearchAfter({
    searchAfterSortIds: undefined,
    timestampOverride,
    index: indexPattern,
    from,
    to,
    services,
    logger,
    filter,
    pageSize: 10000, // TODO: multiple pages?
    buildRuleMessage,
  });
};
