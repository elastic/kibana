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

type FleetAction = Omit<EndpointAction, 'input_type' | 'type' | 'user_id' | 'data'> & {
  data: { log_level: string };
  type: string;
};

type OSQueryAction = Omit<EndpointAction, 'input_type' | 'data'> & {
  input_type: 'osquery';
  data: { id: string; query: string };
};

export class FleetActionGenerator extends BaseDataGenerator {
  _getBaseActionDoc() {
    const timeStamp = new Date(this.randomPastDate());

    return {
      action_id: this.randomUUID(),
      '@timestamp': timeStamp.toISOString(),
      expiration: this.randomFutureDate(timeStamp),
      agents: [this.randomUUID()],
      type: 'INPUT_ACTION',
      input_type: 'endpoint',
      user_id: 'elastic',
    };
  }

  /** Generate a random endpoint Action (isolate or unisolate) */
  generate(overrides: DeepPartial<EndpointAction> = {}): EndpointAction {
    const baseActionDoc = this._getBaseActionDoc();
    return merge(
      {
        ...baseActionDoc,
        data: {
          command: this.randomIsolateCommand(),
          comment: this.randomString(15),
        },
      },
      overrides
    );
  }

  generateOSQueryAction(overrides: DeepPartial<OSQueryAction> = {}): OSQueryAction {
    const baseActionDoc = this._getBaseActionDoc();

    return merge(
      {
        ...baseActionDoc,
        data: {
          id: this.randomUUID(),
          query: '',
        },
      },
      overrides
    );
  }

  generateFleetAction(overrides: DeepPartial<FleetAction> = {}): FleetAction {
    const baseActionDoc = this._getBaseActionDoc();

    const fleetActionDoc = {
      ...baseActionDoc,
      user_id: undefined,
      input_type: undefined,
      type: undefined,
    };

    return merge(
      {
        ...fleetActionDoc,
        data: {
          log_level: 'debug',
        },
        type: 'SETTINGS',
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
