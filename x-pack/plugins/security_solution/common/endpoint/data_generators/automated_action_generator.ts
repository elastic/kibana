/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeepPartial } from 'utility-types';
import { merge } from 'lodash';
import type { EndpointAction } from '../types';
import { FleetActionGenerator } from './fleet_action_generator';

export class AutomatedActionGenerator extends FleetActionGenerator {
  /** Generate a random endpoint Action (isolate or unisolate) */
  generate(overrides: DeepPartial<EndpointAction> = {}): EndpointAction {
    const timeStamp = overrides['@timestamp'] ? new Date(overrides['@timestamp']) : new Date();
    return merge(
      {
        action_id: this.seededUUIDv4(),
        '@timestamp': timeStamp.toISOString(),
        expiration: this.randomFutureDate(timeStamp),
        type: 'INPUT_ACTION',
        input_type: 'endpoint',
        agents: [this.seededUUIDv4()],
        user_id: 'unknown',
        rule: {
          id: 'testid',
          name: 'testname',
        },
        data: {
          command: 'isolate',
          comment: this.randomString(15),
          parameters: undefined,
          output: undefined,
        },
      },
      overrides as EndpointAction
    );
  }
}
