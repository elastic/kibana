/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { DeepPartial } from 'utility-types';
import { merge } from 'lodash';
import { BaseDataGenerator } from './base_data_generator';
import { Agent, AGENTS_INDEX, AgentStatus, FleetServerAgent } from '../../../../fleet/common';

const agentStatusList: readonly AgentStatus[] = [
  'offline',
  'error',
  'online',
  'inactive',
  'warning',
  'enrolling',
  'unenrolling',
  'updating',
  'degraded',
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
        id: hit._id,
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
            id: this.randomUUID(),
            version: this.randomVersion(),
          },
          local_metadata: {
            elastic: {
              agent: {
                'build.original': `8.0.0-SNAPSHOT (build: ${this.randomString(
                  5
                )} at 2021-05-07 18:42:49 +0000 UTC)`,
                id: this.randomUUID(),
                log_level: 'info',
                snapshot: true,
                upgradeable: true,
                version: '8.0.0',
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
          // policy_output_permissions_hash:
          //   '81b3d070dddec145fafcbdfb6f22888495a12edc31881f6b0511fa10de66daa7',
          default_api_key_id: 'so3dWnkBj1tiuAw9yAm3',
          updated_at: now,
          last_checkin: now,
          policy_revision_idx: 2,
          policy_coordinator_idx: 1,
        },
      },
      overrides
    );
  }

  private randomAgentStatus() {
    return this.randomChoice(agentStatusList);
  }
}
