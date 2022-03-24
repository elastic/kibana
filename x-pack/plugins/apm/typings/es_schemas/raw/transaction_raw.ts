/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APMBaseDoc } from './apm_base_doc';
import { Cloud } from './fields/cloud';
import { Container } from './fields/container';
import { EventOutcome } from './fields/event_outcome';
import { Host } from './fields/host';
import { Http } from './fields/http';
import { Kubernetes } from './fields/kubernetes';
import { Page } from './fields/page';
import { Process } from './fields/process';
import { Service } from './fields/service';
import { TimestampUs } from './fields/timestamp_us';
import { Url } from './fields/url';
import { User } from './fields/user';
import { UserAgent } from './fields/user_agent';
import { Faas } from './fields/faas';

interface Processor {
  name: 'transaction';
  event: 'transaction';
}

export interface TransactionRaw extends APMBaseDoc {
  processor: Processor;
  timestamp: TimestampUs;
  trace: { id: string }; // trace is required
  event?: { outcome?: EventOutcome };
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
  ecs?: { version?: string };
  host?: Host;
  http?: Http;
  kubernetes?: Kubernetes;
  process?: Process;
  service: Service;
  url?: Url;
  user?: User;
  user_agent?: UserAgent;
  cloud?: Cloud;
  faas?: Faas;
}
