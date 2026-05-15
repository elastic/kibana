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

  describe('Upsert Rule API', function () {
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

    it('should return 201 and create the rule when the id does not exist', async () => {
      const ruleId = 'upsert-create-rule';

      const response = await supertestWithoutAuth
        .put(`${RULE_API_PATH}/${ruleId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          kind: 'alert',
          metadata: { name: 'created-via-put' },
          time_field: '@timestamp',
          schedule: { every: '5m' },
          evaluation: { query: { base: 'FROM logs-* | LIMIT 10' } },
        });

      expect(response.status).to.be(201);
      expect(response.body.id).to.be(ruleId);
      expect(response.body.kind).to.be('alert');
      expect(response.body.metadata.name).to.be('created-via-put');
      expect(response.body.enabled).to.be(true);
      expect(response.body.createdAt).to.be.a('string');
      expect(response.body.updatedAt).to.be(response.body.createdAt);
    });

    it('should return 200 and replace the rule when the id already exists', async () => {
      const ruleId = 'upsert-replace-rule';

      const createResponse = await supertestWithoutAuth
        .put(`${RULE_API_PATH}/${ruleId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          kind: 'alert',
          metadata: { name: 'first-version', owner: 'team-a', tags: ['v1'] },
          time_field: '@timestamp',
          schedule: { every: '5m', lookback: '10m' },
          evaluation: { query: { base: 'FROM logs-* | LIMIT 10' } },
          grouping: { fields: ['host.name'] },
        });

      expect(createResponse.status).to.be(201);
      const originalCreatedAt = createResponse.body.createdAt as string;
      const originalCreatedBy = createResponse.body.createdBy as string;

      const replaceResponse = await supertestWithoutAuth
        .put(`${RULE_API_PATH}/${ruleId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          kind: 'alert',
          metadata: { name: 'second-version', owner: 'team-b' },
          time_field: '@timestamp',
          schedule: { every: '10m' },
          evaluation: { query: { base: 'FROM metrics-* | LIMIT 5' } },
        });

      expect(replaceResponse.status).to.be(200);
      expect(replaceResponse.body.id).to.be(ruleId);

      // Replaced fields take the new values.
      expect(replaceResponse.body.metadata).to.eql({ name: 'second-version', owner: 'team-b' });
      expect(replaceResponse.body.schedule).to.eql({ every: '10m' });
      expect(replaceResponse.body.evaluation).to.eql({
        query: { base: 'FROM metrics-* | LIMIT 5' },
      });

      // Fields not in the new body are dropped (PUT replaces the whole resource).
      expect(replaceResponse.body.grouping).to.be(undefined);

      // Audit metadata and operational state are preserved.
      expect(replaceResponse.body.createdBy).to.be(originalCreatedBy);
      expect(replaceResponse.body.createdAt).to.be(originalCreatedAt);
      expect(replaceResponse.body.enabled).to.be(true);

      // updatedAt advances on replace.
      expect(replaceResponse.body.updatedAt).not.to.be(originalCreatedAt);
    });

    it('should preserve enabled=false on replace', async () => {
      const ruleId = 'upsert-preserve-disabled-rule';

      const createResponse = await supertestWithoutAuth
        .put(`${RULE_API_PATH}/${ruleId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          kind: 'alert',
          metadata: { name: 'to-be-disabled' },
          time_field: '@timestamp',
          schedule: { every: '5m' },
          evaluation: { query: { base: 'FROM logs-* | LIMIT 10' } },
        });
      expect(createResponse.status).to.be(201);

      await supertestWithoutAuth
        .post(`${RULE_API_PATH}/_bulk_disable`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ ids: [ruleId] })
        .expect(200);

      const replaceResponse = await supertestWithoutAuth
        .put(`${RULE_API_PATH}/${ruleId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          kind: 'alert',
          metadata: { name: 'replaced-while-disabled' },
          time_field: '@timestamp',
          schedule: { every: '5m' },
          evaluation: { query: { base: 'FROM logs-* | LIMIT 10' } },
        });

      expect(replaceResponse.status).to.be(200);
      expect(replaceResponse.body.enabled).to.be(false);
    });

    it('should return 400 when the body is invalid', async () => {
      const response = await supertestWithoutAuth
        .put(`${RULE_API_PATH}/upsert-bad-body-rule`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          metadata: { name: 'no-kind' },
          time_field: '@timestamp',
          schedule: { every: '5m' },
          evaluation: { query: { base: 'FROM logs-* | LIMIT 10' } },
        });

      expect(response.status).to.be(400);
    });

    it('should return 400 when the body is missing required fields', async () => {
      const response = await supertestWithoutAuth
        .put(`${RULE_API_PATH}/upsert-missing-fields-rule`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ kind: 'alert', metadata: { name: 'incomplete' } });

      expect(response.status).to.be(400);
    });
  });
}
