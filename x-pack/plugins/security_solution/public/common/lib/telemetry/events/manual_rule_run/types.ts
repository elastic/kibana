/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RootSchema } from '@kbn/core/public';

export enum ManualRuleRunEventTypes {
  ManualRuleRunOpenModal = 'Manual Rule Run Open Modal',
  ManualRuleRunExecute = 'Manual Rule Run Execute',
  ManualRuleRunCancelJob = 'Manual Rule Run Cancel Job',
}
interface ReportManualRuleRunOpenModalParams {
  type: 'single' | 'bulk';
}

interface ReportManualRuleRunExecuteParams {
  rangeInMs: number;
  rulesCount: number;
  status: 'success' | 'error';
}

interface ReportManualRuleRunCancelJobParams {
  totalTasks: number;
  completedTasks: number;
  errorTasks: number;
}

export type ManualRuleRunEventTypeData = {
  [K in ManualRuleRunEventTypes]: K extends ManualRuleRunEventTypes.ManualRuleRunOpenModal
    ? ReportManualRuleRunOpenModalParams
    : K extends ManualRuleRunEventTypes.ManualRuleRunExecute
    ? ReportManualRuleRunExecuteParams
    : K extends ManualRuleRunEventTypes.ManualRuleRunCancelJob
    ? ReportManualRuleRunCancelJobParams
    : never;
};

export type ManualRuleRunTelemetryEvent =
  | {
      eventType: ManualRuleRunEventTypes.ManualRuleRunOpenModal;
      schema: RootSchema<ReportManualRuleRunOpenModalParams>;
    }
  | {
      eventType: ManualRuleRunEventTypes.ManualRuleRunExecute;
      schema: RootSchema<ReportManualRuleRunExecuteParams>;
    }
  | {
      eventType: ManualRuleRunEventTypes.ManualRuleRunCancelJob;
      schema: RootSchema<ReportManualRuleRunCancelJobParams>;
    };
