/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeepPartial } from 'utility-types';
import { merge } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ENDPOINT_ACTION_RESPONSES_DS, ENDPOINT_ACTIONS_DS } from '../constants';
import { BaseDataGenerator } from './base_data_generator';
import type {
  ActionDetails,
  EndpointActivityLogAction,
  EndpointActivityLogActionResponse,
  EndpointPendingActions,
  LogsEndpointAction,
  LogsEndpointActionResponse,
  ProcessesEntry,
  EndpointActionDataParameterTypes,
  ActionResponseOutput,
} from '../types';
import { ActivityLogItemTypes } from '../types';
import { RESPONSE_ACTION_API_COMMANDS_NAMES } from '../service/response_actions/constants';

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

    const command = overrides?.EndpointActions?.data?.command ?? this.randomResponseActionCommand();
    let parameters: EndpointActionDataParameterTypes = overrides?.EndpointActions?.data?.parameters;
    let output: ActionResponseOutput = overrides?.EndpointActions?.data
      ?.output as ActionResponseOutput;

    if (command === 'get-file') {
      if (!parameters) {
        parameters = {
          file: '/some/path/bad_file.txt',
        };
      }

      if (!output) {
        output = {
          type: 'json',
          content: {
            file: {
              name: 'bad_file.txt',
              path: '/some/path/bad_file.txt',
              size: 221,
            },
          },
        };
      }
    }

    return merge(
      {
        '@timestamp': timeStamp.toISOString(),
        agent: {
          id: this.seededUUIDv4(),
        },
        EndpointActions: {
          action_id: this.seededUUIDv4(),
          completed_at: timeStamp.toISOString(),
          // randomly before a few hours/minutes/seconds later
          started_at: new Date(startedAtTimes[this.randomN(startedAtTimes.length)]).toISOString(),
          data: {
            command,
            comment: '',
            parameters,
            output,
          },
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
      hosts: { 'agent-a': { name: 'Host-agent-a' } },
      id: '123',
      isCompleted: true,
      isExpired: false,
      wasSuccessful: true,
      errors: undefined,
      startedAt: '2022-04-27T16:08:47.449Z',
      status: 'successful',
      comment: 'thisisacomment',
      createdBy: 'auserid',
      parameters: undefined,
      outputs: {},
      agentState: {
        'agent-a': {
          errors: undefined,
          isCompleted: true,
          completedAt: '2022-04-30T16:08:47.449Z',
          wasSuccessful: true,
        },
      },
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
          data: this.generateResponse({ ...(overrides?.item?.data ?? {}) }),
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

  randomResponseActionProcesses(n?: number): ProcessesEntry[] {
    const numberOfEntries = n ?? this.randomChoice([20, 30, 40, 50]);
    const entries = [];
    for (let i = 0; i < numberOfEntries; i++) {
      entries.push({
        command: this.randomResponseActionProcessesCommand(),
        pid: this.randomN(1000).toString(),
        entity_id: this.randomString(50),
        user: this.randomUser(),
      });
    }

    return entries;
  }

  protected randomResponseActionProcessesCommand() {
    const commands = [
      '/opt/cmd1',
      '/opt/cmd2',
      '/opt/cmd3/opt/cmd3/opt/cmd3/opt/cmd3/opt/cmd3/opt/cmd3/opt/cmd3/opt/cmd3',
      '/opt/cmd3/opt/cmd3/opt/cmd3/opt/cmd3',
    ];

    return this.randomChoice(commands);
  }

  protected randomResponseActionCommand() {
    return this.randomChoice(RESPONSE_ACTION_API_COMMANDS_NAMES);
  }
}
