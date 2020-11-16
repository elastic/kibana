/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APMBaseDoc } from './apm_base_doc';
import { Container } from './fields/container';
import { Kubernetes } from './fields/kubernetes';

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

type TransactionDurationMetric = BaseMetric & {
  transaction: {
    name: string;
    type: string;
    result?: string;
    duration: {
      histogram: {
        values: number[];
        counts: number[];
      };
    };
  };
  service: {
    name: string;
    node?: {
      name: string;
    };
    environment?: string;
    version?: string;
  };
  container?: Container;
  kubernetes?: Kubernetes;
};

export type SpanDestinationMetric = BaseMetric & {
  span: {
    destination: {
      service: {
        resource: string;
        response_time: {
          count: number;
          sum: {
            us: number;
          };
        };
      };
    };
  };
};

export type MetricRaw =
  | BaseMetric
  | TransactionBreakdownMetric
  | SpanBreakdownMetric
  | TransactionDurationMetric
  | SpanDestinationMetric
  | SystemMetric
  | CGroupMetric
  | JVMMetric;
