/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { AlertServices, AlertTypeState } from '../../../../../../alerting/server';
import { SearchTypes } from '../../../../../common/detection_engine/types';
import { ThresholdRuleParams } from '../../schemas/rule_schemas';
import { BuildRuleMessage } from '../../signals/rule_messages';
import { SignalSearchResponse } from '../../signals/types';

export interface ThresholdSignalHistoryRecord {
  terms: Array<{
    field?: string;
    value: SearchTypes;
  }>;
  lastSignalTimestamp: number;
}

export interface ThresholdSignalHistory {
  [hash: string]: ThresholdSignalHistoryRecord;
}

export interface ThresholdAlertState extends AlertTypeState {
  signalHistory: ThresholdSignalHistory;
}

export interface BulkCreateThresholdSignalParams {
  results: SignalSearchResponse;
  ruleParams: ThresholdRuleParams;
  services: AlertServices & { logger: Logger };
  inputIndexPattern: string[];
  ruleId: string;
  startedAt: Date;
  from: Date;
  thresholdSignalHistory: ThresholdSignalHistory;
  buildRuleMessage: BuildRuleMessage;
}
