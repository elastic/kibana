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
import { cleanFleetIndices, createTestSpace } from './helpers';

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

    before(async () => {
      TEST_SPACE_1 = spaces.getDefaultTestSpace();
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({
        space: TEST_SPACE_1,
      });
      await cleanFleetIndices(esClient);
      await createTestSpace(providerContext, TEST_SPACE_1);

      await apiClient.postEnableSpaceAwareness();

      // every policy created by the api client has an inactivity timeout
      [defaultSpacePolicy, testSpacePolicy, allSpacesPolicy] = await Promise.all([
        apiClient.createAgentPolicy(),
        apiClient.createAgentPolicy(TEST_SPACE_1),
        apiClient.createAgentPolicy(undefined, { space_ids: ['*'] }),
      ]);
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({
        space: TEST_SPACE_1,
      });
      await cleanFleetIndices(esClient);
    });

    // The status script params, that hold the inactivity cutoff of each policy, are part of the
    // report job payload which is returned by the reporting API. They must only list the policies
    // available in the space the report is generated from.
    async function getPolicyIdsInReportPayload(spaceId?: string): Promise<string[]> {
      const prefix = spaceId ? `/s/${spaceId}` : '';
      const response = await supertest
        .post(`${prefix}/internal/fleet/agents/reporting/generate?apiVersion=1`)
        .set('kbn-xsrf', 'xxx')
        .send({
          // the agent does not need to exist, only the payload of the job is checked
          agents: ['agent-that-does-not-exist'],
          fields: ['agent.id', 'status'],
          timezone: 'UTC',
        })
        .expect(200);

      expect(response.body.url).match(reportUrlPattern);
      const jobId = response.body.url.split('/').pop();

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

    it('should only list the policies of the default space and of all spaces in a report generated from the default space', async () => {
      const policyIds = await getPolicyIdsInReportPayload();

      expect(policyIds).to.contain(defaultSpacePolicy.item.id);
      expect(policyIds).to.contain(allSpacesPolicy.item.id);
      expect(policyIds).not.to.contain(testSpacePolicy.item.id);
    });

    it('should only list the policies of the test space and of all spaces in a report generated from the test space', async () => {
      const policyIds = await getPolicyIdsInReportPayload(TEST_SPACE_1);

      expect(policyIds).to.contain(testSpacePolicy.item.id);
      expect(policyIds).to.contain(allSpacesPolicy.item.id);
      expect(policyIds).not.to.contain(defaultSpacePolicy.item.id);
    });
  });
}
