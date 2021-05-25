/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeepPartial } from 'utility-types';
import { merge } from 'lodash';
import { BaseDataGenerator } from './base_data_generator';
import { EndpointAction, EndpointActionResponse } from '../types';

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
          command: 'isolate',
          comment: this.randomString(15),
        },
      },
      overrides
    );
  }

  generateResponse(overrides: DeepPartial<EndpointActionResponse> = {}): EndpointActionResponse {
    return merge(
      {
        action_data: {
          command: 'isolate',
          comment: null,
        },
        action_id: this.randomUUID(),
        agent_id: this.randomUUID(),
        started_at: this.randomPastDate(),
        completed_at: new Date().toISOString(),
        error: 'some error happen',
        '@timestamp': new Date().toISOString(),
      },
      overrides
    );
  }
}
