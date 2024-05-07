/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APMBaseDoc } from './apm_base_doc';
import { Cloud } from './fields/cloud';
import { Container } from './fields/container';
import { Host } from './fields/host';
import { Kubernetes } from './fields/kubernetes';
import { Service } from './fields/service';

type BaseMetric = APMBaseDoc & {
  processor: {
    name: 'metric';
    event: 'metric';
  };
  cloud?: Cloud;
  container?: Container;
  kubernetes?: Kubernetes;
  service?: Service;
  host?: Host;
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
