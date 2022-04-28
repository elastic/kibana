/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeepPartial } from 'utility-types';
import { merge } from 'lodash';
import { BaseDataGenerator } from './base_data_generator';
import { EndpointAction, EndpointActionResponse, ISOLATION_ACTIONS } from '../types';

const ISOLATION_COMMANDS: ISOLATION_ACTIONS[] = ['isolate', 'unisolate'];

export class FleetActionGenerator extends BaseDataGenerator {
  /** Generate a random endpoint Action (isolate or unisolate) */
  generate(overrides: DeepPartial<EndpointAction> = {}): EndpointAction {
    const timeStamp = new Date(this.randomPastDate());

    return merge(
      {
        action_id: this.randomUUID(),
        '@timestamp': timeStamp.toISOString(),
        expiration: this.randomFutureDate(timeStamp),
        type: 'INPUT_ACTION',
        input_type: 'endpoint',
        agents: [this.randomUUID()],
        user_id: 'elastic',
        data: {
          command: this.randomIsolateCommand(),
          comment: this.randomString(15),
        },
      },
      overrides
    );
  }

  generateIsolateAction(overrides: DeepPartial<EndpointAction> = {}): EndpointAction {
    return merge(this.generate({ data: { command: 'isolate' } }), overrides);
  }

  generateUnIsolateAction(overrides: DeepPartial<EndpointAction> = {}): EndpointAction {
    return merge(this.generate({ data: { command: 'unisolate' } }), overrides);
  }

  /** Generates an endpoint action response */
  generateResponse(overrides: DeepPartial<EndpointActionResponse> = {}): EndpointActionResponse {
    const timeStamp = new Date();

    return merge(
      {
        action_data: {
          command: this.randomIsolateCommand(),
          comment: '',
        },
        action_id: this.randomUUID(),
        agent_id: this.randomUUID(),
        started_at: this.randomPastDate(),
        completed_at: timeStamp.toISOString(),
        error: 'some error happened',
        '@timestamp': timeStamp.toISOString(),
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

  protected randomIsolateCommand() {
    return this.randomChoice(ISOLATION_COMMANDS);
  }
}
