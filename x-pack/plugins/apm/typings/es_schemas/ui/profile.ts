/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observer } from '@elastic/eui/src/components/observer/observer';
import { Agent } from './fields/agent';

export interface ProfileStackFrame {
  filename?: string;
  line?: string;
  function: string;
  id: string;
}

export interface Profile {
  agent: Agent;
  '@timestamp': string;
  labels?: {
    [key: string]: string | number | boolean;
  };
  observer?: Observer;
  profile: {
    top: ProfileStackFrame;
    duration: number;
    stack: ProfileStackFrame[];
    id: string;
    wall?: {
      us: number;
    };
    cpu?: {
      ns: number;
    };
    samples: {
      count: number;
    };
  };
}
