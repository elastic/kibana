/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimestampOverrideOrUndefined } from '../../../../../common/detection_engine/schemas/common/schemas';
import type {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
} from '../../../../../../alerting/server';
import type { Logger } from '../../../../../../../../src/core/server';
import type { ThresholdSignalHistory } from '../types';
import type { BuildRuleMessage } from '../rule_messages';
import { findPreviousThresholdSignals } from './find_previous_threshold_signals';
import { buildThresholdSignalHistory } from './build_signal_history';

interface GetThresholdSignalHistoryParams {
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

export const getThresholdSignalHistory = async ({
  from,
  to,
  indexPattern,
  services,
  logger,
  ruleId,
  bucketByFields,
  timestampOverride,
  buildRuleMessage,
}: GetThresholdSignalHistoryParams): Promise<{
  signalHistory: ThresholdSignalHistory;
  searchErrors: string[];
}> => {
  // TODO: use ruleDataClient.getReader()
  const { searchResult, searchErrors } = await findPreviousThresholdSignals({
    indexPattern,
    from,
    to,
    services,
    logger,
    ruleId,
    bucketByFields,
    timestampOverride,
    buildRuleMessage,
  });

  return {
    signalHistory: buildThresholdSignalHistory({
      alerts: searchResult.hits.hits,
    }),
    searchErrors,
  };
};
