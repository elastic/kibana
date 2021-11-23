/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpStart } from 'kibana/public';
import { PROCESS_EVENTS_ROUTE } from '../../../common/constants';

export interface ProcessEventResults {
  events: {
    hits: any[];
    total: number;
  };
  alerts: {
    hits: any[];
    total: number;
  };
}

export async function getSessionViewProcessEvents({
  http,
  sessionEntityId,
}: {
  http: HttpStart;
  sessionEntityId: string;
}): Promise<ProcessEventResults> {
  return http.get<ProcessEventResults>(PROCESS_EVENTS_ROUTE, {
    query: {
      sessionEntityId,
    },
  });
}
