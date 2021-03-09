/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JobStatus } from '../../../../../common/detection_engine/schemas/common/schemas';

export type RuleExecutionStatus = JobStatus;

type StatusMappingTo<TValue> = Readonly<Record<RuleExecutionStatus, TValue>>;

const statusSeverityByStatus: StatusMappingTo<number> = Object.freeze({
  succeeded: 0,
  'going to run': 10,
  warning: 20,
  'partial failure': 20,
  failed: 30,
});

export const getStatusSeverity = (status: RuleExecutionStatus): number => {
  return statusSeverityByStatus[status] ?? 0;
};
