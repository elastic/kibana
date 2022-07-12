/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';

interface OsqueryResponseAction {
  type: string;
  params: {
    query: string;
    ecs_mapping?: Record<string, Record<'field', string>>;
  };
}

export interface OsqueryActionPayload {
  agentIds: string[];
  query: string;
  ecs_mapping?: Record<string, Record<'field', string>>;
  id?: string;
}

type ResponseAction = OsqueryResponseAction;

interface ScheduleNotificationActions {
  signals: unknown[];
  responseActions: ResponseAction[];
}

interface IAlert {
  agent?: {
    id: string;
  };
}

export const scheduleNotificationResponseActions = (
  { signals, responseActions }: ScheduleNotificationActions,
  osqueryCreateAction?: (payload: OsqueryActionPayload) => void
) => {
  const agentIds = uniq((signals as IAlert[]).map((alert: IAlert) => alert.agent?.id));
  responseActions.forEach((responseActionParam) => {
    if (responseActionParam.type === 'osquery' && osqueryCreateAction) {
      osqueryCreateAction({ ...responseActionParam.params, agentIds: agentIds as string[] });
    }
  });
};
