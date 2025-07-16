/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EventOutcome, StatusCode } from '@kbn/apm-types';
import { STATUS_CODE, EVENT_OUTCOME } from '@kbn/apm-types';

const STATUS_FIELD_NAME = [EVENT_OUTCOME, STATUS_CODE] as const;

export interface TraceItem {
  id: string;
  timestampUs: number;
  name: string;
  traceId: string;
  duration: number;
  errorCount: number;
  status?: {
    fieldName: (typeof STATUS_FIELD_NAME)[number];
    value: EventOutcome | StatusCode;
  };
  parentId?: string;
  serviceName: string;
}
