/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeepPartial } from 'utility-types';
import { merge } from 'lodash';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '@kbn/fleet-plugin/common';
import { BaseDataGenerator } from './base_data_generator';
import {
  ActivityLogActionResponse,
  ActivityLogItemTypes,
  EndpointAction,
  EndpointActionResponse,
  ISOLATION_ACTIONS,
} from '../types';

const ISOLATION_COMMANDS: ISOLATION_ACTIONS[] = ['isolate', 'unisolate'];

export class FleetActionGenerator extends BaseDataGenerator {
  /** Generate a random endpoint Action (isolate or unisolate) */
  generate(overrides: DeepPartial<EndpointAction> = {}): EndpointAction {
    const timeStamp = overrides['@timestamp']
      ? new Date(overrides['@timestamp'])
      : new Date(this.randomPastDate());

    return merge(
      {
        action_id: this.seededUUIDv4(),
        '@timestamp': timeStamp.toISOString(),
        expiration: this.randomFutureDate(timeStamp),
        type: 'INPUT_ACTION',
        input_type: 'endpoint',
        agents: [this.seededUUIDv4()],
        user_id: 'elastic',
        data: {
          command: this.randomIsolateCommand(),
          comment: this.randomString(15),
        },
      },
      overrides
    );
  }

  generateActionEsHit(
    overrides: DeepPartial<EndpointAction> = {}
  ): estypes.SearchHit<EndpointAction> {
    return Object.assign(this.toEsSearchHit(this.generate(overrides)), {
      _index: AGENT_ACTIONS_INDEX,
    });
  }

  generateIsolateAction(overrides: DeepPartial<EndpointAction> = {}): EndpointAction {
    return merge(this.generate({ data: { command: 'isolate' } }), overrides);
  }

  generateUnIsolateAction(overrides: DeepPartial<EndpointAction> = {}): EndpointAction {
    return merge(this.generate({ data: { command: 'unisolate' } }), overrides);
  }

  /** Generates an endpoint action response */
  generateResponse(overrides: DeepPartial<EndpointActionResponse> = {}): EndpointActionResponse {
    const timeStamp = overrides['@timestamp'] ? new Date(overrides['@timestamp']) : new Date();

    return merge(
      {
        action_data: {
          command: this.randomIsolateCommand(),
          comment: '',
        },
        action_id: this.seededUUIDv4(),
        agent_id: this.seededUUIDv4(),
        started_at: this.randomPastDate(),
        completed_at: timeStamp.toISOString(),
        error: 'some error happened',
        '@timestamp': timeStamp.toISOString(),
      },
      overrides
    );
  }

  generateResponseEsHit(
    overrides: DeepPartial<EndpointActionResponse> = {}
  ): estypes.SearchHit<EndpointActionResponse> {
    return Object.assign(this.toEsSearchHit(this.generateResponse(overrides)), {
      _index: AGENT_ACTIONS_RESULTS_INDEX,
    });
  }

  /**
   * An Activity Log entry as returned by the Activity log API
   * @param overrides
   */
  generateActivityLogActionResponse(
    overrides: DeepPartial<ActivityLogActionResponse> = {}
  ): ActivityLogActionResponse {
    return merge(
      {
        type: ActivityLogItemTypes.FLEET_RESPONSE,
        item: {
          id: this.seededUUIDv4(),
          data: this.generateResponse(),
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

  protected randomIsolateCommand() {
    return this.randomChoice(ISOLATION_COMMANDS);
  }
}
