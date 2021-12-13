/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type ActionKind = 'event' | 'metrics' | 'error';
interface ActionBase<
  P extends string,
  A extends string,
  K extends ActionKind,
  KbnAction extends object
> {
  event: {
    provider: P;
    action: A;
    kind: K;
    id: string;
    timezone?: string;
    created?: string;
    end?: string;
    duration?: number;
  };
  kibana: { uuid: string } & KbnAction;
  user?: { name: string };
  log: {
    logger: P;
    level: K extends 'error' ? 'error' : 'info';
  };
}

interface ErrorAction {
  error: {
    message: string;
    code?: number;
    stack_trace?: string;
    type?: string;
  };
}

type ReportingAction<A extends string, K extends ActionKind> = ActionBase<
  'reporting',
  A,
  K,
  {
    reporting:
      | (K extends 'event'
          ? {
              appName: string;
              jobType: string;
              contentType: string;
              attempt: number;
              status: 'pending' | 'processing' | 'completed' | 'failed';
            }
          : {})
      | {
          csv?: K extends 'event'
            ? { numColumns: number }
            : K extends 'metrics'
            ? { byteLength?: number; numRows?: number; scrollTime?: number }
            : undefined;
        };
  }
>;
