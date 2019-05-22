/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APMBaseDoc } from './APMBaseDoc';
import { Container } from './fields/Container';
import { Context } from './fields/Context';
import { Host } from './fields/Host';
import { Http } from './fields/Http';
import { Kubernetes } from './fields/Kubernetes';
import { Process } from './fields/Process';
import { Service } from './fields/Service';
import { IStackframe } from './fields/Stackframe';
import { Url } from './fields/Url';
import { User } from './fields/User';

interface Processor {
  name: 'error';
  event: 'error';
}

interface Exception {
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
    log?: Log;
  };

  // Shared by errors and transactions
  container?: Container;
  context?: Context;
  host?: Host;
  http?: Http;
  kubernetes?: Kubernetes;
  process?: Process;
  service: Service;
  url?: Url;
  user?: User;
}
