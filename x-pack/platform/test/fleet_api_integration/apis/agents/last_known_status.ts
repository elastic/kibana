/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { HAS_CHANGED_RUNTIME_FIELD } from '@kbn/fleet-plugin/server/tasks/agent_status_change_task';
import { _buildStatusRuntimeField } from '@kbn/fleet-plugin/server/services/agents/build_status_runtime_field';
import { AGENTS_INDEX } from '@kbn/fleet-plugin/common';

import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { cleanFleetAgents, createFleetAgent } from '../space_awareness/helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const es = getService('es');

  describe('fleet_last_known_status_task', () => {
    beforeEach(async () => {
      await cleanFleetAgents(es);
    });
    afterEach(async () => {
      await cleanFleetAgents(es);
    });

    describe('hasChanged runtime fields', () => {
      const runtimeFields = Object.assign(
        {},
        _buildStatusRuntimeField({
          inactivityTimeouts: [],
          logger: undefined,
        }),
        HAS_CHANGED_RUNTIME_FIELD
      );

      const SCENARIOS = [
        {
          name: 'should return hasChanged:true for an online agent without last_known_status',
          agentAttrs: {}, // Create an online agent
          expectedHasChanged: true,
        },
        {
          name: 'should return hasChanged:true for an online agent with last_known_status:offline',
          agentAttrs: { last_known_status: 'offline' },
          expectedHasChanged: true,
        },
        {
          name: 'should return hasChanged:false for an online agent with last_known_status:online',
          agentAttrs: { last_known_status: 'online' },
          expectedHasChanged: false,
        },
      ];

      for (const scenario of SCENARIOS) {
        it(scenario.name, async () => {
          const agent = await createFleetAgent(es, 'test', undefined, scenario.agentAttrs as any);

          const res = await es.search({
            index: AGENTS_INDEX,
            runtime_mappings: runtimeFields,
            fields: Object.keys(runtimeFields),
          });

          const agentDoc = res.hits.hits.find((hit) => hit._id === agent);
          expect(agentDoc).not.to.be(undefined);
          expect(agentDoc).not.to.be(undefined);
          expect(agentDoc!.fields).not.to.be(undefined);
          expect(agentDoc!.fields!.hasChanged[0]).to.be(scenario.expectedHasChanged);
        });
      }
    });
  });
}
