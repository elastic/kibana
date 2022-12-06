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
  ResponseActionGetFileOutputContent,
  ResponseActionGetFileParameters,
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
    let output: ActionResponseOutput<ResponseActionGetFileOutputContent> = overrides
      ?.EndpointActions?.data?.output as ActionResponseOutput<ResponseActionGetFileOutputContent>;

    if (command === 'get-file') {
      if (!output) {
        output = {
          type: 'json',
          content: {
            code: 'ra_get-file_success_done',
            zip_size: 123,
            contents: [
              {
                type: 'file',
                path: '/some/path/bad_file.txt',
                size: 1234,
                file_name: 'bad_file.txt',
                sha256: '9558c5cb39622e9b3653203e772b129d6c634e7dbd7af1b244352fc1d704601f',
              },
            ],
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

  generateActionDetails<
    TOutputType extends object = object,
    TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes
  >(
    overrides: Partial<ActionDetails<TOutputType, TParameters>> = {}
  ): ActionDetails<TOutputType, TParameters> {
    const details: ActionDetails = merge(
      {
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
      },
      overrides
    );

    if (details.command === 'get-file') {
      if (!details.parameters) {
        (
          details as ActionDetails<
            ResponseActionGetFileOutputContent,
            ResponseActionGetFileParameters
          >
        ).parameters = {
          path: '/some/file.txt',
        };
      }

      if (!details.outputs || Object.keys(details.outputs).length === 0) {
        details.outputs = {
          [details.agents[0]]: {
            type: 'json',
            content: {
              code: 'ra_get-file_success',
              path: '/some/file/txt',
              size: 1234,
              zip_size: 123,
            },
          },
        };
      }
    }

    return details as unknown as ActionDetails<TOutputType, TParameters>;
  }

  randomGetFileFailureCode(): string {
    return this.randomChoice([
      'ra_get-file_error_not-found',
      'ra_get-file_error_is-directory',
      'ra_get-file_error_invalid-input',
      'ra_get-file_error_not-permitted',
      'ra_get-file_error_too-big',
      'ra_get-file_error_disk-quota',
      'ra_get-file_error_processing',
      'ra_get-file_error_upload-api-unreachable',
      'ra_get-file_error_upload-timeout',
      'ra_get-file_error_queue-timeout',
    ]);
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
