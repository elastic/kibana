/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RootSchema } from '@kbn/core/public';
import type { TelemetryEventTypes } from '../../constants';

export interface ReportManualRuleRunOpenModalParams {
  type: 'single' | 'bulk';
}

export interface ReportManualRuleRunExecuteParams {
  rangeInMs: number;
  rulesCount: number;
  status: 'success' | 'error';
}

export interface ReportManualRuleRunCancelJobParams {
  totalTasks: number;
  completedTasks: number;
  errorTasks: number;
}

export type ReportManualRuleRunTelemetryEventParams =
  | ReportManualRuleRunOpenModalParams
  | ReportManualRuleRunExecuteParams
  | ReportManualRuleRunCancelJobParams;

export type ManualRuleRunTelemetryEvent =
  | {
      eventType: TelemetryEventTypes.ManualRuleRunOpenModal;
      schema: RootSchema<ReportManualRuleRunOpenModalParams>;
    }
  | {
      eventType: TelemetryEventTypes.ManualRuleRunExecute;
      schema: RootSchema<ReportManualRuleRunExecuteParams>;
    }
  | {
      eventType: TelemetryEventTypes.ManualRuleRunCancelJob;
      schema: RootSchema<ReportManualRuleRunCancelJobParams>;
    };
