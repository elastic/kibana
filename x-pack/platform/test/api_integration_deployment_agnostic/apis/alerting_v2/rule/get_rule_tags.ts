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
const RULE_TAGS_PATH = `${RULE_API_PATH}/_tags`;
const RULE_SO_TYPE = 'alerting_rule';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const kibanaServer = getService('kibanaServer');

  async function createRule(roleAuthc: RoleCredentials, name: string, tags?: string[]) {
    return supertestWithoutAuth
      .post(RULE_API_PATH)
      .set(roleAuthc.apiKeyHeader)
      .set(samlAuth.getInternalRequestHeader())
      .send({
        kind: 'alert',
        metadata: { name, ...(tags ? { tags } : {}) },
        time_field: '@timestamp',
        schedule: { every: '5m' },
        evaluation: { query: { base: 'FROM logs-* | LIMIT 10' } },
      });
  }

  describe('Get Rule Tags API', function () {
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

    it('should return an empty tags array when no rules exist', async () => {
      const response = await supertestWithoutAuth
        .get(RULE_TAGS_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(response.status).to.be(200);
      expect(response.body.tags).to.be.an('array');
      expect(response.body.tags.length).to.be(0);
    });

    it('should deduplicate tags shared across many rules', async () => {
      const rulesWithTags: Array<[string, string[]]> = [
        ['tags-rule-1', ['prod', 'infra', 'us-east-1']],
        ['tags-rule-2', ['prod', 'security', 'eu-west-1']],
        ['tags-rule-3', ['staging', 'infra', 'us-west-2']],
        ['tags-rule-4', ['prod', 'observability', 'ap-southeast-1']],
        ['tags-rule-5', ['dev', 'security', 'us-east-1']],
        ['tags-rule-6', ['prod', 'ml', 'eu-central-1']],
        ['tags-rule-7', ['staging', 'observability', 'us-west-2']],
        ['tags-rule-8', ['dev', 'infra', 'ap-northeast-1']],
      ];

      for (const [name, tags] of rulesWithTags) {
        const r = await createRule(roleAuthc, name, tags);
        expect(r.status).to.be(201);
      }

      const expectedTags = [
        'prod',
        'staging',
        'dev',
        'infra',
        'security',
        'observability',
        'ml',
        'us-east-1',
        'us-west-2',
        'eu-west-1',
        'eu-central-1',
        'ap-southeast-1',
        'ap-northeast-1',
      ];

      const response = await supertestWithoutAuth
        .get(RULE_TAGS_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(response.status).to.be(200);
      expect(response.body.tags).to.be.an('array');
      expect(response.body.tags.length).to.be(expectedTags.length);
      for (const tag of expectedTags) {
        expect(response.body.tags).to.contain(tag);
      }
    });

    it('should include tags from a rule with no overlapping tag sets', async () => {
      const r = await createRule(roleAuthc, 'tags-rule-unique', ['custom-team', 'nightly']);
      expect(r.status).to.be(201);

      const response = await supertestWithoutAuth
        .get(RULE_TAGS_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(response.status).to.be(200);
      expect(response.body.tags).to.contain('custom-team');
      expect(response.body.tags).to.contain('nightly');
    });

    it('should not include tags for rules without tags', async () => {
      const r = await createRule(roleAuthc, 'tags-rule-no-tags');
      expect(r.status).to.be(201);

      const response = await supertestWithoutAuth
        .get(RULE_TAGS_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(response.status).to.be(200);
      expect(response.body.tags).to.be.an('array');
      expect(response.body.tags).not.to.contain(undefined);
      expect(response.body.tags).not.to.contain(null);
      expect(response.body.tags).not.to.contain('');
    });
  });
}
