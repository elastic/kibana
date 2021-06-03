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
  /** Generate an Action */
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

  /** Generates an action response */
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
        error: 'some error happen',
        '@timestamp': timeStamp.toISOString(),
      },
      overrides
    );
  }

  protected randomIsolateCommand() {
    return this.randomChoice(ISOLATION_COMMANDS);
  }
}
