/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APMBaseDoc } from './APMBaseDoc';
import { Container } from './fields/Container';
import { Host } from './fields/Host';
import { Http } from './fields/Http';
import { Kubernetes } from './fields/Kubernetes';
import { Page } from './fields/Page';
import { Process } from './fields/Process';
import { Service } from './fields/Service';
import { Url } from './fields/Url';
import { User } from './fields/User';
import { UserAgent } from './fields/UserAgent';

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
}
