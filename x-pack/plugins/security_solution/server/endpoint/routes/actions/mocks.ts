/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-classes-per-file */
/* eslint-disable @typescript-eslint/no-useless-constructor */

import { ApiResponse } from '@elastic/elasticsearch';
import moment from 'moment';
import uuid from 'uuid';
import {
  LogsEndpointAction,
  LogsEndpointActionResponse,
  EndpointAction,
  EndpointActionResponse,
  ISOLATION_ACTIONS,
} from '../../../../common/endpoint/types';

export interface Results {
  _index: string;
  _source:
    | LogsEndpointAction
    | LogsEndpointActionResponse
    | EndpointAction
    | EndpointActionResponse;
}
export const mockAuditLogSearchResult = (results?: Results[]) => {
  const response = {
    body: {
      hits: {
        total: { value: results?.length ?? 0, relation: 'eq' },
        hits:
          results?.map((a: Results) => ({
            _index: a._index,
            _id: Math.random().toString(36).split('.')[1],
            _score: 0.0,
            _source: a._source,
          })) ?? [],
      },
    },
    statusCode: 200,
    headers: {},
    warnings: [],
    meta: {} as any,
  };
  return response;
};

export const mockSearchResult = (results: any = []): ApiResponse<any> => {
  return {
    body: {
      hits: {
        hits: results.map((a: any) => ({
          _source: a,
        })),
      },
    },
    statusCode: 200,
    headers: {},
    warnings: [],
    meta: {} as any,
  };
};

export class MockAction {
  private actionID: string = uuid.v4();
  private ts: moment.Moment = moment();
  private user: string = '';
  private agents: string[] = [];
  private command: ISOLATION_ACTIONS = 'isolate';
  private comment?: string;

  constructor() {}

  public build(): EndpointAction {
    return {
      action_id: this.actionID,
      '@timestamp': this.ts.toISOString(),
      expiration: this.ts.add(2, 'weeks').toISOString(),
      type: 'INPUT_ACTION',
      input_type: 'endpoint',
      agents: this.agents,
      user_id: this.user,
      data: {
        command: this.command,
        comment: this.comment,
      },
    };
  }

  public fromUser(u: string) {
    this.user = u;
    return this;
  }
  public withAgents(a: string[]) {
    this.agents = a;
    return this;
  }
  public withAgent(a: string) {
    this.agents = [a];
    return this;
  }
  public withComment(c: string) {
    this.comment = c;
    return this;
  }
  public withAction(a: ISOLATION_ACTIONS) {
    this.command = a;
    return this;
  }
  public atTime(m: moment.Moment | Date) {
    if (m instanceof Date) {
      this.ts = moment(m);
    } else {
      this.ts = m;
    }
    return this;
  }
  public withID(id: string) {
    this.actionID = id;
    return this;
  }
}

export const aMockAction = (): MockAction => {
  return new MockAction();
};

export class MockResponse {
  private actionID: string = uuid.v4();
  private ts: moment.Moment = moment();
  private started: moment.Moment = moment();
  private completed: moment.Moment = moment();
  private agent: string = '';
  private command: ISOLATION_ACTIONS = 'isolate';
  private comment?: string;
  private error?: string;

  constructor() {}

  public build(): EndpointActionResponse {
    return {
      '@timestamp': this.ts.toISOString(),
      action_id: this.actionID,
      agent_id: this.agent,
      started_at: this.started.toISOString(),
      completed_at: this.completed.toISOString(),
      error: this.error,
      action_data: {
        command: this.command,
        comment: this.comment,
      },
    };
  }

  public forAction(id: string) {
    this.actionID = id;
    return this;
  }
  public forAgent(id: string) {
    this.agent = id;
    return this;
  }
}

export const aMockResponse = (actionID: string, agentID: string): MockResponse => {
  return new MockResponse().forAction(actionID).forAgent(agentID);
};
