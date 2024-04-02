/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALL_VALUE,
  BudgetingMethod,
  IndicatorType,
  Objective,
  timeWindowSchema,
} from '@kbn/slo-schema';
import * as t from 'io-ts';
import { SLODefinition, Status } from '../../../domain/models';

export interface EsSummaryDocument {
  service: {
    environment: string | null;
    name: string | null;
  };
  transaction: {
    name: string | null;
    type: string | null;
  };
  slo: {
    indicator: {
      type: IndicatorType;
      params?: string; // >= 8.14: We store the stringified params on the temp summary document as well as the real summary document (from the ingest pipeline)
    };
    timeWindow: t.OutputOf<typeof timeWindowSchema>;
    groupBy: string | string[];
    groupings: Record<string, unknown>;
    instanceId: string;
    name: string;
    description: string;
    id: string;
    budgetingMethod: BudgetingMethod;
    revision: number;
    objective: Objective;
    tags: string[];
    createdAt?: string; // >= 8.14
    updatedAt?: string; // >= 8.14
  };
  goodEvents: number;
  totalEvents: number;
  errorBudgetEstimated: boolean;
  errorBudgetRemaining: number;
  errorBudgetConsumed: number;
  errorBudgetInitial: number;
  sliValue: number;
  statusCode: number;
  status: Status;
  isTempDoc: boolean;
  spaceId: string;
  kibanaUrl?: string;
}

export function createTempSummaryDocument(slo: SLODefinition, spaceId: string): EsSummaryDocument {
  const apmParams = 'environment' in slo.indicator.params ? slo.indicator.params : null;

  return {
    service: {
      environment: apmParams?.environment ?? null,
      name: apmParams?.service ?? null,
    },
    transaction: {
      name: apmParams?.transactionName ?? null,
      type: apmParams?.transactionType ?? null,
    },
    slo: {
      indicator: {
        type: slo.indicator.type,
        params: JSON.stringify(slo.indicator.params),
      },
      timeWindow: {
        duration: slo.timeWindow.duration.format(),
        type: slo.timeWindow.type,
      },
      groupBy: !!slo.groupBy ? slo.groupBy : ALL_VALUE,
      groupings: {},
      instanceId: ALL_VALUE,
      name: slo.name,
      description: slo.description,
      id: slo.id,
      budgetingMethod: slo.budgetingMethod,
      revision: slo.revision,
      objective: {
        target: slo.objective.target,
        timesliceTarget: slo.objective.timesliceTarget ?? undefined,
        timesliceWindow: slo.objective.timesliceWindow?.format() ?? undefined,
      },
      tags: slo.tags,
      createdAt: slo.createdAt.toISOString(),
      updatedAt: slo.updatedAt.toISOString(),
    },
    goodEvents: 0,
    totalEvents: 0,
    errorBudgetEstimated: false,
    errorBudgetRemaining: 1,
    errorBudgetConsumed: 0,
    errorBudgetInitial: 1 - slo.objective.target,
    sliValue: -1,
    statusCode: 0,
    status: 'NO_DATA',
    isTempDoc: true,
    spaceId,
  };
}
