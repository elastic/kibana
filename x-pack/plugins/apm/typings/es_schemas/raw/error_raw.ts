/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { APMBaseDoc } from './apm_base_doc';
import type { Container } from './fields/container';
import type { Host } from './fields/host';
import type { Http } from './fields/http';
import type { Kubernetes } from './fields/kubernetes';
import type { Page } from './fields/page';
import type { Process } from './fields/process';
import type { Service } from './fields/service';
import type { Stackframe } from './fields/stackframe';
import type { TimestampUs } from './fields/timestamp_us';
import type { Url } from './fields/url';
import type { User } from './fields/user';

interface Processor {
  name: 'error';
  event: 'error';
}

export interface Exception {
  attributes?: {
    response?: string;
  };
  code?: string;
  message?: string; // either message or type are given
  type?: string;
  module?: string;
  handled?: boolean;
  stacktrace?: Stackframe[];
}

interface Log {
  message: string;
  stacktrace?: Stackframe[];
}

export interface ErrorRaw extends APMBaseDoc {
  processor: Processor;
  timestamp: TimestampUs;
  transaction?: {
    id: string;
    sampled?: boolean;
    type: string;
  };
  error: {
    id: string;
    culprit?: string;
    grouping_key: string;
    // either exception or log are given
    exception?: Exception[];
    page?: Page; // special property for RUM: shared by error and transaction
    log?: Log;
    custom?: Record<string, unknown>;
  };

  // Shared by errors and transactions
  container?: Container;
  host?: Host;
  http?: Http;
  kubernetes?: Kubernetes;
  process?: Process;
  service: Service;
  url?: Url;
  user?: User;
}
