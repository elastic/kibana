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
import { IStackframe } from './fields/stackframe';
import { Url } from './fields/url';
import { User } from './fields/user';
import { Observer } from './fields/observer';

interface Processor {
  name: 'error';
  event: 'error';
}

export interface Exception {
  message?: string; // either message or type are given
  type?: string;
  module?: string;
  handled?: boolean;
  stacktrace?: IStackframe[];
}

interface Log {
  message: string;
  stacktrace?: IStackframe[];
}

export interface ErrorRaw extends APMBaseDoc {
  processor: Processor;
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
  observer?: Observer;
}
