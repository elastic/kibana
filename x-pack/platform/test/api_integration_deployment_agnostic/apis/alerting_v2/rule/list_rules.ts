/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import type { RoleCredentials } from '../../../services';

const RULE_API_PATH = '/api/alerting/v2/rules';
const RULE_SO_TYPE = 'alerting_rule';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const kibanaServer = getService('kibanaServer');

  async function createRule(
    roleAuthc: RoleCredentials,
    name: string,
    overrides: Record<string, unknown> = {}
  ) {
    return supertestWithoutAuth
      .post(RULE_API_PATH)
      .set(roleAuthc.apiKeyHeader)
      .set(samlAuth.getInternalRequestHeader())
      .send({
        kind: 'alert',
        metadata: { name },
        time_field: '@timestamp',
        schedule: { every: '5m' },
        evaluation: { query: { base: 'FROM logs-* | LIMIT 10' } },
        ...overrides,
      });
  }

  describe('List Rules API', function () {
    // alerting_v2 plugin is behind a feature flag not available on Cloud/MKI
    this.tags(['skipCloud']);
    let roleAuthc: RoleCredentials;

    before(async () => {
      await kibanaServer.savedObjects.clean({ types: [RULE_SO_TYPE] });
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
    });

    after(async () => {
      await kibanaServer.savedObjects.clean({ types: [RULE_SO_TYPE] });
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('should return empty list when no rules exist', async () => {
      const response = await supertestWithoutAuth
        .get(RULE_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(response.status).to.be(200);
      expect(response.body.items).to.be.an('array');
      expect(response.body.items.length).to.be(0);
      expect(response.body.total).to.be(0);
      expect(response.body.page).to.be(1);
      expect(response.body.perPage).to.be(20);
    });

    it('should return created rules', async () => {
      const createResponse1 = await createRule(roleAuthc, 'rule-1');
      expect(createResponse1.status).to.be(201);

      const createResponse2 = await createRule(roleAuthc, 'rule-2');
      expect(createResponse2.status).to.be(201);

      const response = await supertestWithoutAuth
        .get(RULE_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(response.status).to.be(200);
      expect(response.body.items).to.be.an('array');
      expect(response.body.items.length).to.be(2);
      expect(response.body.total).to.be(2);

      const names = response.body.items.map(
        (item: { metadata: { name: string } }) => item.metadata.name
      );
      expect(names).to.contain('rule-1');
      expect(names).to.contain('rule-2');

      for (const item of response.body.items) {
        expect(item.id).to.be.a('string');
        expect(item.kind).to.be('alert');
        expect(item.metadata.name).to.be.a('string');
        expect(item.schedule).to.be.an('object');
        expect(item.evaluation).to.be.an('object');
        expect(item.createdAt).to.be.a('string');
        expect(item.updatedAt).to.be.a('string');
      }
    });

    it('should paginate results', async () => {
      await createRule(roleAuthc, 'rule-3');

      const firstPage = await supertestWithoutAuth
        .get(RULE_API_PATH)
        .query({ page: 1, perPage: 2 })
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(firstPage.status).to.be(200);
      expect(firstPage.body.items.length).to.be(2);
      expect(firstPage.body.total).to.be(3);
      expect(firstPage.body.page).to.be(1);
      expect(firstPage.body.perPage).to.be(2);

      const secondPage = await supertestWithoutAuth
        .get(RULE_API_PATH)
        .query({ page: 2, perPage: 2 })
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(secondPage.status).to.be(200);
      expect(secondPage.body.items.length).to.be(1);
      expect(secondPage.body.total).to.be(3);
      expect(secondPage.body.page).to.be(2);
      expect(secondPage.body.perPage).to.be(2);
    });

    describe('filter', () => {
      beforeEach(async () => {
        await kibanaServer.savedObjects.clean({ types: [RULE_SO_TYPE] });
      });

      it('should filter rules by kind', async () => {
        const alertResponse = await createRule(roleAuthc, 'alert-rule', { kind: 'alert' });
        expect(alertResponse.status).to.be(201);

        const signalResponse = await createRule(roleAuthc, 'signal-rule', { kind: 'signal' });
        expect(signalResponse.status).to.be(201);

        const response = await supertestWithoutAuth
          .get(RULE_API_PATH)
          .query({
            perPage: 1000,
            filter: 'kind: signal',
          })
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader());

        expect(response.status).to.be(200);
        expect(response.body.items.length).to.be(1);
        expect(response.body.items[0].kind).to.be('signal');
        expect(response.body.items[0].metadata.name).to.be('signal-rule');
      });

      it('should filter rules by enabled status', async () => {
        const createResponse = await createRule(roleAuthc, 'enabled-rule');
        expect(createResponse.status).to.be(201);

        const createResponse2 = await createRule(roleAuthc, 'to-disable-rule');
        expect(createResponse2.status).to.be(201);

        // Disable the second rule
        await supertestWithoutAuth
          .post(`${RULE_API_PATH}/_bulk_disable`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ ids: [createResponse2.body.id] });

        const response = await supertestWithoutAuth
          .get(RULE_API_PATH)
          .query({
            perPage: 1000,
            filter: 'enabled: false',
          })
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader());

        expect(response.status).to.be(200);
        expect(response.body.items.length).to.be(1);
        expect(response.body.items[0].id).to.be(createResponse2.body.id);
        expect(response.body.items[0].enabled).to.be(false);
      });

      it('should filter rules by metadata.name', async () => {
        await createRule(roleAuthc, 'cpu-threshold');
        await createRule(roleAuthc, 'disk-usage');

        const response = await supertestWithoutAuth
          .get(RULE_API_PATH)
          .query({ perPage: 1000, filter: 'metadata.name: "cpu-threshold"' })
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader());

        expect(response.status).to.be(200);
        expect(response.body.items.length).to.be(1);
        expect(response.body.items[0].metadata.name).to.be('cpu-threshold');
      });

      it('should filter rules by metadata.description', async () => {
        await createRule(roleAuthc, 'rule-with-desc', {
          metadata: {
            name: 'rule-with-desc',
            description: 'Monitors memory pressure',
          },
        });
        await createRule(roleAuthc, 'rule-other-desc', {
          metadata: {
            name: 'rule-other-desc',
            description: 'Tracks network latency',
          },
        });

        const response = await supertestWithoutAuth
          .get(RULE_API_PATH)
          .query({ perPage: 1000, filter: 'metadata.description: "memory"' })
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader());

        expect(response.status).to.be(200);
        expect(response.body.items.length).to.be(1);
        expect(response.body.items[0].metadata.name).to.be('rule-with-desc');
      });

      it('should filter rules by metadata.owner', async () => {
        await createRule(roleAuthc, 'owned-rule', {
          metadata: { name: 'owned-rule', owner: 'team-alpha' },
        });
        await createRule(roleAuthc, 'other-owned-rule', {
          metadata: { name: 'other-owned-rule', owner: 'team-beta' },
        });

        const response = await supertestWithoutAuth
          .get(RULE_API_PATH)
          .query({ perPage: 1000, filter: 'metadata.owner: "team-alpha"' })
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader());

        expect(response.status).to.be(200);
        expect(response.body.items.length).to.be(1);
        expect(response.body.items[0].metadata.name).to.be('owned-rule');
      });

      it('should filter rules by metadata.tags', async () => {
        await createRule(roleAuthc, 'tagged-rule', {
          metadata: { name: 'tagged-rule', tags: ['production', 'critical'] },
        });
        await createRule(roleAuthc, 'untagged-rule');

        const response = await supertestWithoutAuth
          .get(RULE_API_PATH)
          .query({ perPage: 1000, filter: 'metadata.tags: "critical"' })
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader());

        expect(response.status).to.be(200);
        expect(response.body.items.length).to.be(1);
        expect(response.body.items[0].metadata.name).to.be('tagged-rule');
      });

      it('should filter rules by grouping.fields', async () => {
        await createRule(roleAuthc, 'grouped-rule', {
          grouping: { fields: ['host.name'] },
        });
        await createRule(roleAuthc, 'ungrouped-rule');

        const response = await supertestWithoutAuth
          .get(RULE_API_PATH)
          .query({ perPage: 1000, filter: 'grouping.fields: "host.name"' })
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader());

        expect(response.status).to.be(200);
        expect(response.body.items.length).to.be(1);
        expect(response.body.items[0].metadata.name).to.be('grouped-rule');
      });

      it('should support compound filters', async () => {
        await createRule(roleAuthc, 'alert-prod', {
          kind: 'alert',
          metadata: { name: 'alert-prod', tags: ['production'] },
        });
        await createRule(roleAuthc, 'signal-prod', {
          kind: 'signal',
          metadata: { name: 'signal-prod', tags: ['production'] },
        });
        await createRule(roleAuthc, 'alert-dev', {
          kind: 'alert',
          metadata: { name: 'alert-dev', tags: ['development'] },
        });

        const response = await supertestWithoutAuth
          .get(RULE_API_PATH)
          .query({
            perPage: 1000,
            filter: 'kind: alert AND metadata.tags: "production"',
          })
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader());

        expect(response.status).to.be(200);
        expect(response.body.items.length).to.be(1);
        expect(response.body.items[0].metadata.name).to.be('alert-prod');
      });

      it('should return all rules when no filter is provided', async () => {
        const r1 = await createRule(roleAuthc, 'no-filter-a');
        expect(r1.status).to.be(201);

        const r2 = await createRule(roleAuthc, 'no-filter-b');
        expect(r2.status).to.be(201);

        const response = await supertestWithoutAuth
          .get(RULE_API_PATH)
          .query({ perPage: 1000 })
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader());

        expect(response.status).to.be(200);
        expect(response.body.items.length).to.be(2);
      });
    });

    describe('search', () => {
      beforeEach(async () => {
        await kibanaServer.savedObjects.clean({ types: [RULE_SO_TYPE] });
      });

      it('should search rules by a name prefix', async () => {
        const prefixMatch = await createRule(roleAuthc, 'Limit120');
        expect(prefixMatch.status).to.be(201);

        const searchResponse = await supertestWithoutAuth
          .get(RULE_API_PATH)
          .query({ search: 'lim' })
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader());

        expect(searchResponse.status).to.be(200);
        expect(searchResponse.body.items.length).to.be(1);
        expect(searchResponse.body.items[0].metadata.name).to.be('Limit120');
      });

      it('should search rules by name and description', async () => {
        const nameMatch = await createRule(roleAuthc, 'cpu threshold');
        expect(nameMatch.status).to.be(201);

        const descMatch = await createRule(roleAuthc, 'network threshold', {
          metadata: { name: 'network threshold', description: 'Monitors production latency' },
        });
        expect(descMatch.status).to.be(201);

        const responseByName = await supertestWithoutAuth
          .get(RULE_API_PATH)
          .query({ search: 'cpu' })
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader());

        expect(responseByName.status).to.be(200);
        expect(responseByName.body.items.length).to.be(1);
        expect(responseByName.body.items[0].metadata.name).to.be('cpu threshold');

        const responseByDesc = await supertestWithoutAuth
          .get(RULE_API_PATH)
          .query({ search: 'production' })
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader());

        expect(responseByDesc.status).to.be(200);
        expect(responseByDesc.body.items.length).to.be(1);
        expect(
          responseByDesc.body.items.map(
            (item: { metadata: { name: string } }) => item.metadata.name
          )
        ).to.contain('network threshold');
      });

      it('should search rules by description', async () => {
        const descMatch = await createRule(roleAuthc, 'desc-match-rule', {
          metadata: {
            name: 'desc-match-rule',
            description: 'Monitors memory pressure on production hosts',
          },
        });
        expect(descMatch.status).to.be(201);

        const noMatch = await createRule(roleAuthc, 'no-desc-match', {
          metadata: { name: 'no-desc-match', description: 'Tracks network latency' },
        });
        expect(noMatch.status).to.be(201);

        const responseByDesc = await supertestWithoutAuth
          .get(RULE_API_PATH)
          .query({ search: 'memory' })
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader());

        expect(responseByDesc.status).to.be(200);
        expect(responseByDesc.body.items.length).to.be(1);
        expect(responseByDesc.body.items[0].metadata.name).to.be('desc-match-rule');
      });

      it('should compose search with pagination', async () => {
        const response1 = await createRule(roleAuthc, 'prod rule 1', {
          metadata: { name: 'prod rule 1', tags: ['prod'] },
        });
        expect(response1.status).to.be(201);

        const response2 = await createRule(roleAuthc, 'prod rule 2', {
          metadata: { name: 'prod rule 2', tags: ['prod'] },
        });
        expect(response2.status).to.be(201);

        const response3 = await createRule(roleAuthc, 'dev rule 1', {
          metadata: { name: 'dev rule 1', tags: ['dev'] },
        });
        expect(response3.status).to.be(201);

        const firstPage = await supertestWithoutAuth
          .get(RULE_API_PATH)
          .query({ search: 'prod', page: 1, perPage: 1 })
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader());

        expect(firstPage.status).to.be(200);
        expect(firstPage.body.items.length).to.be(1);
        expect(firstPage.body.total).to.be(2);
        expect(firstPage.body.page).to.be(1);
        expect(firstPage.body.perPage).to.be(1);

        const secondPage = await supertestWithoutAuth
          .get(RULE_API_PATH)
          .query({ search: 'prod', page: 2, perPage: 1 })
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader());

        expect(secondPage.status).to.be(200);
        expect(secondPage.body.items.length).to.be(1);
        expect(secondPage.body.total).to.be(2);
        expect(secondPage.body.page).to.be(2);
        expect(secondPage.body.perPage).to.be(1);
      });
    });
  });
}
