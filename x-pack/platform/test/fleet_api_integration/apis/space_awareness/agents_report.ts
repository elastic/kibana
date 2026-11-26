/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry from 'p-retry';
import expect from '@kbn/expect';
import type { CreateAgentPolicyResponse } from '@kbn/fleet-plugin/common';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { SpaceTestApiClient } from './api_helper';
import { cleanFleetIndices, createFleetAgent, createTestSpace } from './helpers';

const reportUrlPattern = /\/api\/reporting\/jobs\/download\/.+/;

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;

  const supertest = getService('supertest');
  const esClient = getService('es');
  const kibanaServer = getService('kibanaServer');
  const spaces = getService('spaces');

  let TEST_SPACE_1: string;

  describe('agents report', function () {
    skipIfNoDockerRegistry(providerContext);
    const apiClient = new SpaceTestApiClient(supertest);

    let defaultSpacePolicy: CreateAgentPolicyResponse;
    let testSpacePolicy: CreateAgentPolicyResponse;
    let allSpacesPolicy: CreateAgentPolicyResponse;

    // The report selects agents on the `agent.id` field, which `createFleetAgent` does not set
    const DEFAULT_SPACE_STALE_AGENT_ID = 'report-stale-agent-default-space';
    const TEST_SPACE_STALE_AGENT_ID = 'report-stale-agent-test-space';

    before(async () => {
      TEST_SPACE_1 = spaces.getDefaultTestSpace();
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({
        space: TEST_SPACE_1,
      });
      await cleanFleetIndices(esClient);
      await createTestSpace(providerContext, TEST_SPACE_1);

      await apiClient.postEnableSpaceAwareness();

      // every policy created by the api client has an inactivity timeout (24,000 seconds)
      [defaultSpacePolicy, testSpacePolicy, allSpacesPolicy] = await Promise.all([
        apiClient.createAgentPolicy(),
        apiClient.createAgentPolicy(TEST_SPACE_1),
        apiClient.createAgentPolicy(undefined, { space_ids: ['*'] }),
      ]);

      // agents that checked in long before the inactivity timeout of their policy
      const staleCheckin = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      await Promise.all([
        createFleetAgent(esClient, defaultSpacePolicy.item.id, 'default', {
          agent: { id: DEFAULT_SPACE_STALE_AGENT_ID, version: '8.15.0' },
          last_checkin: staleCheckin,
        }),
        createFleetAgent(esClient, testSpacePolicy.item.id, TEST_SPACE_1, {
          agent: { id: TEST_SPACE_STALE_AGENT_ID, version: '8.15.0' },
          last_checkin: staleCheckin,
        }),
      ]);
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({
        space: TEST_SPACE_1,
      });
      await cleanFleetIndices(esClient);
    });

    async function generateReport(agentIds: string[], spaceId?: string): Promise<string> {
      const prefix = spaceId ? `/s/${spaceId}` : '';
      const response = await supertest
        .post(`${prefix}/internal/fleet/agents/reporting/generate?apiVersion=1`)
        .set('kbn-xsrf', 'xxx')
        .send({
          agents: agentIds,
          fields: ['agent.id', 'status'],
          timezone: 'UTC',
        })
        .expect(200);

      expect(response.body.url).match(reportUrlPattern);
      return response.body.url.split('/').pop();
    }

    // The status script params, that hold the inactivity cutoff of each policy, are part of the
    // report job payload which is returned by the reporting API. They must only list the policies
    // available in the space the report is generated from.
    async function getPolicyIdsInReportPayload(jobId: string, spaceId?: string) {
      const prefix = spaceId ? `/s/${spaceId}` : '';
      const job = await pRetry(
        async () => {
          const jobResponse = await supertest
            .get(`${prefix}/internal/reporting/jobs/info/${jobId}`)
            .set('kbn-xsrf', 'xxx')
            .set('elastic-api-version', '1')
            .expect(200);
          return jobResponse.body;
        },
        { retries: 5, minTimeout: 1000 }
      );

      const statusScript =
        job.payload?.searchSource?.index?.runtimeFieldMap?.status?.script ?? undefined;
      expect(statusScript).to.be.an('object');

      return Object.keys(statusScript.params.inactivityCutoffs);
    }

    // Checks what the report really contains: the cutoffs have to reach Elasticsearch for the status
    // of the agents to be computed correctly.
    async function getReportCsv(jobId: string): Promise<string> {
      return pRetry(
        async () => {
          const response = await supertest.get(`/api/reporting/jobs/download/${jobId}`).expect(200);
          return response.text as string;
        },
        { retries: 6, minTimeout: 1000 }
      );
    }

    it('should only list the policies of the default space and of all spaces in a report generated from the default space', async () => {
      const jobId = await generateReport([DEFAULT_SPACE_STALE_AGENT_ID]);
      const policyIds = await getPolicyIdsInReportPayload(jobId);

      expect(policyIds).to.contain(defaultSpacePolicy.item.id);
      expect(policyIds).to.contain(allSpacesPolicy.item.id);
      expect(policyIds).not.to.contain(testSpacePolicy.item.id);

      // the stale agent is inactive only if the cutoff of its policy reached the status script
      const csv = await getReportCsv(jobId);
      expect(csv).to.contain(DEFAULT_SPACE_STALE_AGENT_ID);
      expect(csv).to.contain('inactive');
      expect(csv).not.to.contain('offline');
    });

    it('should only list the policies of the test space and of all spaces in a report generated from the test space', async () => {
      const jobId = await generateReport([TEST_SPACE_STALE_AGENT_ID], TEST_SPACE_1);
      const policyIds = await getPolicyIdsInReportPayload(jobId, TEST_SPACE_1);

      expect(policyIds).to.contain(testSpacePolicy.item.id);
      expect(policyIds).to.contain(allSpacesPolicy.item.id);
      expect(policyIds).not.to.contain(defaultSpacePolicy.item.id);

      const csv = await getReportCsv(jobId);
      expect(csv).to.contain(TEST_SPACE_STALE_AGENT_ID);
      expect(csv).to.contain('inactive');
      expect(csv).not.to.contain('offline');
    });
  });
}
