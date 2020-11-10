/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APMBaseDoc } from './apm_base_doc';

type BaseMetric = APMBaseDoc & {
  processor: {
    name: 'metric';
    event: 'metric';
  };
};

type BaseBreakdownMetric = BaseMetric & {
  transaction: {
    name: string;
    type: string;
  };
  span: {
    self_time: {
      count: number;
      sum: {
        us: number;
      };
    };
  };
};

type TransactionBreakdownMetric = BaseBreakdownMetric & {
  transaction: {
    duration: {
      count: number;
      sum: {
        us: number;
      };
    };
    breakdown: {
      count: number;
    };
  };
};

type SpanBreakdownMetric = BaseBreakdownMetric & {
  span: {
    type: string;
    subtype?: string;
  };
};

type SystemMetric = BaseMetric & {
  system: unknown;
  service: {
    node?: {
      name: string;
    };
  };
};

type CGroupMetric = SystemMetric;
type JVMMetric = SystemMetric & {
  jvm: unknown;
};

export type MetricRaw =
  | BaseMetric
  | TransactionBreakdownMetric
  | SpanBreakdownMetric
  | SystemMetric
  | CGroupMetric
  | JVMMetric;
