/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

function getBaseUrl(spaceId?: string) {
  return spaceId ? `/s/${spaceId}` : '';
}

export async function pollResult(
  supertestAgent: any,
  actionId: string,
  nbAgentsAck: number,
  verifyActionResult: Function,
  spaceId?: string
) {
  await new Promise((resolve, reject) => {
    let attempts = 0;
    const intervalId = setInterval(async () => {
      if (attempts > 4) {
        clearInterval(intervalId);
        reject(new Error('action timed out'));
      }
      ++attempts;
      const {
        body: { items: actionStatuses },
      } = await supertestAgent
        .get(`${getBaseUrl(spaceId)}/api/fleet/agents/action_status`)
        .set('kbn-xsrf', 'xxx');
      const action = actionStatuses.find((a: any) => a.actionId === actionId);
      if (action && action.nbAgentsAck === nbAgentsAck) {
        clearInterval(intervalId);
        await verifyActionResult();
        resolve({});
      }
    }, 3000);
  }).catch((e) => {
    throw e;
  });
}

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const fleetAndAgents = getService('fleetAndAgents');

  describe('fleet_update_agent_tags', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      await fleetAndAgents.setup();
    });
    beforeEach(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/agents');
      await getService('supertest').post(`/api/fleet/setup`).set('kbn-xsrf', 'xxx').send();
    });
    afterEach(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/agents');
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    describe('bulk update agent tags', () => {
      it('should allow to bulk update tags of multiple agents by id', async () => {
        await supertest
          .post(`/api/fleet/agents/bulk_update_agent_tags`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: ['agent1', 'agent4'],
            tagsToAdd: ['newTag', 'newTag'],
            tagsToRemove: ['existingTag'],
          })
          .expect(200);
        const [agent1data, agent4data] = await Promise.all([
          supertest.get(`/api/fleet/agents/agent1`).set('kbn-xsrf', 'xxx'),
          supertest.get(`/api/fleet/agents/agent4`).set('kbn-xsrf', 'xxx'),
        ]);
        expect(agent1data.body.item.tags).to.eql(['newTag', 'tag1']);
        expect(agent4data.body.item.tags).to.eql(['newTag']);
      });

      it('should not add the same tag again if it exists', async () => {
        await supertest
          .post(`/api/fleet/agents/bulk_update_agent_tags`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: ['agent2'],
            tagsToAdd: ['existingTag'],
          })
          .expect(200);
        const [agent2data] = await Promise.all([
          supertest.get(`/api/fleet/agents/agent2`).set('kbn-xsrf', 'xxx'),
        ]);
        expect(agent2data.body.item.tags).to.eql(['existingTag']);
      });

      it('should bulk update tags of multiple agents by kuery - add', async () => {
        const { body: actionBody } = await supertest
          .post(`/api/fleet/agents/bulk_update_agent_tags`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: 'active: true',
            tagsToAdd: ['newTag'],
            tagsToRemove: [],
          })
          .expect(200);

        const actionId = actionBody.actionId;

        const verifyActionResult = async () => {
          const { body } = await supertest
            .get(`/api/fleet/agents?kuery=fleet-agents.tags:newTag`)
            .set('kbn-xsrf', 'xxx');
          expect(body.total).to.eql(4);
        };

        await pollResult(supertest, actionId, 4, verifyActionResult);
      });

      it('should bulk update tags of multiple agents by kuery - remove', async () => {
        const { body: actionBody } = await supertest
          .post(`/api/fleet/agents/bulk_update_agent_tags`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: 'active: true',
            tagsToAdd: [],
            tagsToRemove: ['existingTag'],
          })
          .expect(200);

        const actionId = actionBody.actionId;

        const verifyActionResult = async () => {
          const { body } = await supertest
            .get(`/api/fleet/agents?kuery=fleet-agents.tags:existingTag`)
            .set('kbn-xsrf', 'xxx');
          expect(body.total).to.eql(0);
        };

        await pollResult(supertest, actionId, 2, verifyActionResult);
      });

      it('should return 200 also if the kuery is valid', async () => {
        await supertest
          .get(`/api/fleet/agents?kuery=tags:fleet-agents.existingTag`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
      });

      it('should return 200 also if the kuery does not have prefix fleet-agents', async () => {
        await supertest
          .get(`/api/fleet/agents?kuery=tags:existingTag`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
      });

      it('with enableStrictKQLValidation should return 400 if the passed kuery is not correct ', async () => {
        await supertest
          .get(`/api/fleet/agents?kuery=fleet-agents.non_existent_parameter:existingTag`)
          .set('kbn-xsrf', 'xxxx')
          .expect(400);
      });

      it('with enableStrictKQLValidation should return 400 if the passed kuery is invalid', async () => {
        await supertest
          .get(`/api/fleet/agents?kuery='test%3A'`)
          .set('kbn-xsrf', 'xxxx')
          .expect(400);
      });

      it('should not update tags of hosted agent', async () => {
        // move agent2 to policy2 to keep it regular
        await supertest.post(`/api/fleet/agents/agent2/reassign`).set('kbn-xsrf', 'xxx').send({
          policy_id: 'policy2',
        });
        // update enrolled policy to hosted
        await supertest.put(`/api/fleet/agent_policies/policy1`).set('kbn-xsrf', 'xxxx').send({
          name: 'Test policy',
          namespace: 'default',
          is_managed: true,
        });

        // attempt to update tags of agent in hosted agent policy
        await supertest
          .post(`/api/fleet/agents/bulk_update_agent_tags`)
          .set('kbn-xsrf', 'xxx')
          .send({
            tagsToAdd: ['newTag'],
            agents: ['agent1', 'agent2'],
          })
          .expect(200);

        const [agent1data, agent2data] = await Promise.all([
          supertest.get(`/api/fleet/agents/agent1`),
          supertest.get(`/api/fleet/agents/agent2`),
        ]);

        expect(agent1data.body.item.tags.includes('newTag')).to.be(false);
        expect(agent2data.body.item.tags.includes('newTag')).to.be(true);

        const { body } = await supertest
          .get(`/api/fleet/agents/action_status`)
          .set('kbn-xsrf', 'xxx');
        const actionStatus = body.items[0];
        expect(actionStatus.status).to.eql('COMPLETE');
        expect(actionStatus.nbAgentsAck).to.eql(1);
      });
    });
  });
}
