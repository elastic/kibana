/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APMDoc } from './APMDoc';
import { Container } from './fields/Container';
import { Context } from './fields/Context';
import { Host } from './fields/Host';
import { Kubernetes } from './fields/Kubernetes';
import { Process } from './fields/Process';
import { Url } from './fields/Url';
import { User } from './fields/User';

interface Processor {
  name: 'transaction';
  event: 'transaction';
}

export interface Transaction extends APMDoc {
  processor: Processor;
  transaction: {
    duration: { us: number };
    id: string;
    marks?: {
      agent?: {
        [name: string]: number;
      };
    };
    name: string; // name could be missing in ES but the UI will always only aggregate on transactions with a name
    result?: string;
    sampled: boolean;
    span_count?: {
      started?: number;
      dropped?: number;
    };
    type: string;
  };

  // Shared by errors and transactions
  container?: Container;
  context?: Context;
  host?: Host;
  kubernetes?: Kubernetes;
  process?: Process;
  url?: Url;
  user?: User;
}
