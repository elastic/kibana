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
import { Url } from './fields/url';
import { User } from './fields/user';
import { UserAgent } from './fields/user_agent';
import { Observer } from './fields/observer';

interface Processor {
  name: 'transaction';
  event: 'transaction';
}

export interface TransactionRaw extends APMBaseDoc {
  processor: Processor;
  trace: { id: string }; // trace is required
  transaction: {
    duration: { us: number };
    id: string;
    marks?: {
      // "agent": not defined by APM Server - only sent by RUM agent
      agent?: {
        [name: string]: number;
      };
    };
    name?: string;
    page?: Page; // special property for RUM: shared by error and transaction
    result?: string;
    sampled: boolean;
    span_count?: {
      started?: number;
      dropped?: number;
    };
    type: string;
    custom?: Record<string, unknown>;
    message?: {
      queue?: { name: string };
      age?: { ms: number };
      body?: string;
      headers?: Record<string, unknown>;
    };
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
  user_agent?: UserAgent;
  observer?: Observer;
}
