/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimestampOverrideOrUndefined } from '../../../../common/detection_engine/schemas/common/schemas';
import { singleSearchAfter } from './single_search_after';

import { AlertServices } from '../../../../../alerts/server';
import { Logger } from '../../../../../../../src/core/server';
import { SignalSearchResponse } from './types';
import { BuildRuleMessage } from './rule_messages';

interface FindPreviousThresholdSignalsParams {
  from: string;
  to: string;
  indexPattern: string[];
  services: AlertServices;
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
    rule: {
      filter: {
        term: {
          'signal.rule.rule_id': ruleId,
        },
      },
      aggs: {
        threshold: {
          terms: {
            field: bucketByField,
          },
          aggs: {
            lastSignalTimestamp: {
              max: {
                field: '@timestamp', // TODO: or timestampOverride? Or signal.original_time?
              },
            },
          },
        },
      },
    },
  };

  const filter = {
    match_all: {},
  };

  // TODO: paginate
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
  });
};
