/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeepPartial } from 'utility-types';
import { merge } from 'lodash';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ENDPOINT_ACTION_RESPONSES_DS, ENDPOINT_ACTIONS_DS } from '../constants';
import { BaseDataGenerator } from './base_data_generator';
import {
  ActionDetails,
  ActivityLogItemTypes,
  EndpointActivityLogAction,
  EndpointActivityLogActionResponse,
  EndpointPendingActions,
  LogsEndpointAction,
  LogsEndpointActionResponse,
  RESPONSE_ACTION_COMMANDS,
} from '../types';

export class EndpointActionGenerator extends BaseDataGenerator {
  /** Generate a random endpoint Action request (isolate or unisolate) */
  generate(overrides: DeepPartial<LogsEndpointAction> = {}): LogsEndpointAction {
    const timeStamp = overrides['@timestamp'] ? new Date(overrides['@timestamp']) : new Date();

    return merge(
      {
        '@timestamp': timeStamp.toISOString(),
        agent: {
          id: [this.seededUUIDv4()],
        },
        EndpointActions: {
          action_id: this.seededUUIDv4(),
          expiration: this.randomFutureDate(timeStamp),
          type: 'INPUT_ACTION',
          input_type: 'endpoint',
          data: {
            command: this.randomResponseActionCommand(),
            comment: this.randomString(15),
            parameters: undefined,
          },
        },
        error: undefined,
        user: {
          id: this.randomUser(),
        },
      },
      overrides
    );
  }

  generateActionEsHit(
    overrides: DeepPartial<LogsEndpointAction> = {}
  ): estypes.SearchHit<LogsEndpointAction> {
    return Object.assign(this.toEsSearchHit(this.generate(overrides)), {
      _index: `.ds-${ENDPOINT_ACTIONS_DS}-some_namespace`,
    });
  }

  generateIsolateAction(overrides: DeepPartial<LogsEndpointAction> = {}): LogsEndpointAction {
    return merge(this.generate({ EndpointActions: { data: { command: 'isolate' } } }), overrides);
  }

  generateUnIsolateAction(overrides: DeepPartial<LogsEndpointAction> = {}): LogsEndpointAction {
    return merge(this.generate({ EndpointActions: { data: { command: 'unisolate' } } }), overrides);
  }

  /** Generates an endpoint action response */
  generateResponse(
    overrides: DeepPartial<LogsEndpointActionResponse> = {}
  ): LogsEndpointActionResponse {
    const timeStamp = overrides['@timestamp'] ? new Date(overrides['@timestamp']) : new Date();

    const startedAtTimes: number[] = [];
    [2, 3, 5, 8, 13, 21].forEach((n) => {
      startedAtTimes.push(
        timeStamp.setMinutes(-this.randomN(n)),
        timeStamp.setSeconds(-this.randomN(n))
      );
    });

    return merge(
      {
        '@timestamp': timeStamp.toISOString(),
        agent: {
          id: this.seededUUIDv4(),
        },
        EndpointActions: {
          action_id: this.seededUUIDv4(),
          completed_at: timeStamp.toISOString(),
          data: {
            command: this.randomResponseActionCommand(),
            comment: '',
            parameters: undefined,
          },
          // randomly before a few hours/minutes/seconds later
          started_at: new Date(startedAtTimes[this.randomN(startedAtTimes.length)]).toISOString(),
        },
        error: undefined,
      },
      overrides
    );
  }

  generateResponseEsHit(
    overrides: DeepPartial<LogsEndpointActionResponse> = {}
  ): estypes.SearchHit<LogsEndpointActionResponse> {
    return Object.assign(this.toEsSearchHit(this.generateResponse(overrides)), {
      _index: `.ds-${ENDPOINT_ACTION_RESPONSES_DS}-some_namespace-something`,
    });
  }

  generateActionDetails(overrides: DeepPartial<ActionDetails> = {}): ActionDetails {
    const details: ActionDetails = {
      agents: ['agent-a'],
      command: 'isolate',
      completedAt: '2022-04-30T16:08:47.449Z',
      id: '123',
      isCompleted: true,
      isExpired: false,
      wasSuccessful: true,
      errors: undefined,
      startedAt: '2022-04-27T16:08:47.449Z',
      comment: 'thisisacomment',
      createdBy: 'auserid',
      parameters: undefined,
    };

    return merge(details, overrides);
  }

  generateActivityLogAction(
    overrides: DeepPartial<EndpointActivityLogAction>
  ): EndpointActivityLogAction {
    return merge(
      {
        type: ActivityLogItemTypes.ACTION,
        item: {
          id: this.seededUUIDv4(),
          data: this.generate(),
        },
      },
      overrides
    );
  }

  generateActivityLogActionResponse(
    overrides: DeepPartial<EndpointActivityLogActionResponse>
  ): EndpointActivityLogActionResponse {
    return merge(
      {
        type: ActivityLogItemTypes.RESPONSE,
        item: {
          id: this.seededUUIDv4(),
          data: this.generateResponse(),
        },
      },
      overrides
    );
  }

  generateAgentPendingActionsSummary(
    overrides: Partial<EndpointPendingActions> = {}
  ): EndpointPendingActions {
    return merge(
      {
        agent_id: this.seededUUIDv4(),
        pending_actions: {
          isolate: 2,
          unisolate: 0,
        },
      },
      overrides
    );
  }

  randomFloat(): number {
    return this.random();
  }

  randomN(max: number): number {
    return super.randomN(max);
  }

  protected randomResponseActionCommand() {
    return this.randomChoice(RESPONSE_ACTION_COMMANDS);
  }
}
