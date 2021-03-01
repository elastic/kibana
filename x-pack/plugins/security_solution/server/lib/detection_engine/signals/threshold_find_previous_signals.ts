/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
    searchAfterSortId: undefined,
    timestampOverride,
    index: indexPattern,
    from,
    to,
    services,
    logger,
    filter,
    pageSize: 10000, // TODO: multiple pages?
    buildRuleMessage,
    excludeDocsWithTimestampOverride: false,
  });
};
