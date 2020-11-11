/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APMBaseDoc } from './apm_base_doc';
import { Container } from './fields/container';
import { Host } from './fields/host';
import { Http } from './fields/http';
import { Kubernetes } from './fields/kubernetes';
import { Page } from './fields/page';
import { Process } from './fields/process';
import { Service } from './fields/service';
import { Stackframe } from './fields/stackframe';
import { TimestampUs } from './fields/timestamp_us';
import { Url } from './fields/url';
import { User } from './fields/user';

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
  [key: string]: unknown;
}

interface Log {
  message: string;
  stacktrace?: Stackframe[];
  [key: string]: unknown;
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
  [key: string]: unknown;

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
