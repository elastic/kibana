/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { DeepPartial } from 'utility-types';
import { merge } from 'lodash';
import type {
  Agent,
  AgentStatus,
  FleetServerAgent,
  FleetServerAgentComponentStatus,
} from '@kbn/fleet-plugin/common';
import { FleetServerAgentComponentStatuses, AGENTS_INDEX } from '@kbn/fleet-plugin/common';
import moment from 'moment';
import { BaseDataGenerator } from './base_data_generator';
import { ENDPOINT_ERROR_CODES } from '../constants';

// List of computed (as in, done in code is kibana via
// https://github.com/elastic/kibana/blob/main/x-pack/plugins/fleet/common/services/agent_status.ts#L13-L44
const agentStatusList: readonly AgentStatus[] = [
  'offline',
  'error',
  'online',
  'inactive',
  'enrolling',
  'unenrolling',
  'updating',
  'degraded',
];

const lastCheckinStatusList: ReadonlyArray<FleetServerAgent['last_checkin_status']> = [
  'error',
  'online',
  'degraded',
  'updating',
];

export class FleetAgentGenerator extends BaseDataGenerator<Agent> {
  /**
   * @param [overrides] any partial value to the full Agent record
   *
   * @example
   *
   * fleetAgentGenerator.generate({
   *  local_metadata: {
   *    elastic: {
   *      agent: {
   *        log_level: `debug`
   *      }
   *    }
   *  }
   *  });
   */
  generate(overrides: DeepPartial<Agent> = {}): Agent {
    const hit = this.generateEsHit();

    // The mapping below is identical to `searchHitToAgent()` located in
    // `x-pack/plugins/fleet/server/services/agents/helpers.ts:19`
    return merge(
      {
        // Casting here is needed because several of the attributes in `FleetServerAgent` are
        // defined as optional, but required in `Agent` type.
        ...(hit._source as Agent),
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        id: hit._id!,
        policy_revision: hit._source?.policy_revision_idx,
        access_api_key: undefined,
        status: this.randomAgentStatus(),
        packages: hit._source?.packages ?? [],
      },
      overrides
    );
  }

  /**
   * @param [overrides] any partial value to the full document
   */
  generateEsHit(
    overrides: DeepPartial<estypes.SearchHit<FleetServerAgent>> = {}
  ): estypes.SearchHit<FleetServerAgent> {
    const hostname = this.randomHostname();
    const now = new Date().toISOString();
    const osFamily = this.randomOSFamily();
    const version = overrides?._source?.agent?.version ?? this.randomVersion();
    const componentStatus = this.randomChoice<FleetServerAgentComponentStatus>(
      FleetServerAgentComponentStatuses
    );
    const componentInputPayload =
      componentStatus === 'FAILED'
        ? {
            error: {
              code: ENDPOINT_ERROR_CODES.ES_CONNECTION_ERROR,
              message: 'Unable to connect to Elasticsearch',
            },
          }
        : { extra: 'payload' };
    const agentId = overrides?._source?.agent?.id ?? this.randomUUID();

    return merge<
      estypes.SearchHit<FleetServerAgent>,
      DeepPartial<estypes.SearchHit<FleetServerAgent>>
    >(
      {
        _index: AGENTS_INDEX,
        _id: this.randomUUID(),
        _score: 1.0,
        _source: {
          access_api_key_id: 'jY3dWnkBj1tiuAw9pAmq',
          action_seq_no: -1,
          active: true,
          enrolled_at: now,
          agent: {
            id: agentId,
            version,
          },
          local_metadata: {
            elastic: {
              agent: {
                'build.original': `${version} (build: ${this.randomString(
                  5
                )} at 2021-05-07 18:42:49 +0000 UTC)`,
                id: agentId,
                log_level: 'info',
                snapshot: true,
                upgradeable: true,
                version,
              },
            },
            host: {
              architecture: 'x86_64',
              hostname,
              id: this.randomUUID(),
              ip: [this.randomIP()],
              mac: [this.randomMac()],
              name: hostname,
            },
            os: {
              family: osFamily,
              full: `${osFamily} 2019 Datacenter`,
              kernel: '10.0.17763.1879 (Build.160101.0800)',
              name: `${osFamily} Server 2019 Datacenter`,
              platform: osFamily,
              version: this.randomVersion(),
            },
          },
          user_provided_metadata: {},
          policy_id: this.randomUUID(),
          type: 'PERMANENT',
          default_api_key: 'so3dWnkBj1tiuAw9yAm3:t7jNlnPnR6azEI_YpXuBXQ',
          default_api_key_id: 'so3dWnkBj1tiuAw9yAm3',
          updated_at: now,
          last_checkin: now,
          policy_revision_idx: 2,
          policy_coordinator_idx: 1,
          components: [
            {
              id: 'endpoint-0',
              type: 'endpoint',
              status: componentStatus,
              message: 'Running as external service',
              units: [
                {
                  id: 'endpoint-1',
                  type: 'input',
                  status: componentStatus,
                  message: 'Protecting machine',
                  payload: componentInputPayload,
                },
                {
                  id: 'shipper',
                  type: 'output',
                  status: componentStatus,
                  message: 'Connected over GRPC',
                  payload: {
                    extra: 'payload',
                  },
                },
              ],
            },
          ],
          last_checkin_status: this.randomChoice(lastCheckinStatusList),
          upgraded_at: null,
          upgrade_started_at: null,
          unenrolled_at: undefined,
          unenrollment_started_at: undefined,
        },
      },
      overrides
    );
  }

  generateEsHitWithStatus(
    status: AgentStatus,
    overrides: DeepPartial<estypes.SearchHit<FleetServerAgent>> = {}
  ) {
    const esHit = this.generateEsHit(overrides);

    // Basically: reverse engineer the Fleet agent status runtime field:
    // https://github.com/elastic/kibana/blob/main/x-pack/plugins/fleet/server/services/agents/build_status_runtime_field.ts

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const fleetServerAgent = esHit._source!;

    // Reset the `last_checkin_status since we're controlling the agent status here
    fleetServerAgent.last_checkin_status = 'online';

    switch (status) {
      case 'degraded':
        fleetServerAgent.last_checkin_status = 'degraded';
        break;

      case 'enrolling':
        fleetServerAgent.last_checkin = undefined;

        break;
      case 'error':
        fleetServerAgent.last_checkin_status = 'error';
        break;

      // not able to generate agents with inactive status without a valid agent policy
      // with inactivity_timeout set
      case 'inactive':
      case 'offline':
        // current fleet timeout interface for offline is 5 minutes
        // https://github.com/elastic/kibana/blob/main/x-pack/plugins/fleet/common/services/agent_status.ts#L11
        fleetServerAgent.last_checkin = moment().subtract(6, 'minutes').toISOString();
        break;

      case 'unenrolling':
        fleetServerAgent.unenrollment_started_at = fleetServerAgent.updated_at;
        fleetServerAgent.unenrolled_at = undefined;
        break;

      case 'updating':
        fleetServerAgent.upgrade_started_at = fleetServerAgent.updated_at;
        fleetServerAgent.upgraded_at = undefined;
        break;

      // default is `online`, which is also the default returned by `generateEsHit()`
    }

    return esHit;
  }

  public randomAgentStatus() {
    return this.randomChoice(agentStatusList);
  }

  public randomString(length: number = 5) {
    return super.randomString(length);
  }
}
