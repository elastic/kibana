/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { OBSERVABILITY_RULE_TYPE_IDS } from '@kbn/rule-data-utils';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { Alert } from '@kbn/alerts-as-data-utils';
import type { FieldDescriptor } from '@kbn/data-views-plugin/server';
import {
  secOnlyReadSpacesAll,
  noKibanaPrivileges,
  superUser,
  secOnlySpacesAllEsReadAll,
  secOnlySpaces2EsReadAll,
  obsOnlySpacesAll,
  obsOnlyReadSpacesAll,
} from '../../../common/lib/authentication/users';
import type { User } from '../../../common/lib/authentication/types';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import { getSpaceUrlPrefix } from '../../../common/lib/authentication/spaces';

type AlertDoc = Alert & { runCount: number };

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');
  const es = getService('es');
  const TEST_URL = '/internal/rac/alerts/fields';

  const createEsQueryRule = async (spaceId: string = 'default') => {
    const name = 'stack-rule';
    const { body: createdRule } = await supertest
      .post(`${getSpaceUrlPrefix(spaceId)}/api/alerting/rule`)
      .set('kbn-xsrf', 'foo')
      .send({
        name,
        schedule: {
          interval: '5s',
        },
        consumer: 'stackAlerts',
        rule_type_id: '.es-query',
        actions: [],
        tags: [name],
        params: {
          searchType: 'esQuery',
          timeWindowSize: 5,
          timeWindowUnit: 'd',
          threshold: [0],
          thresholdComparator: '>',
          size: 100,
          esQuery: '{\n    "query":{\n      "match_all" : {}\n    }\n  }',
          aggType: 'count',
          groupBy: 'all',
          termSize: 5,
          excludeHitsFromPreviousRun: false,
          sourceFields: [],
          index: ['kibana_sample_data_logs'],
          timeField: '@timestamp',
        },
      })
      .expect(200);
    return createdRule;
  };

  const createSecurityRule = async (index: string, spaceId: string = 'default') => {
    const { body: createdRule } = await supertest
      .post(`${getSpaceUrlPrefix(spaceId)}/api/detection_engine/rules`)
      .set('kbn-xsrf', 'foo')
      .send({
        type: 'query',
        filters: [],
        language: 'kuery',
        query: '_id: *',
        required_fields: [],
        data_view_id: index,
        author: [],
        false_positives: [],
        references: [],
        risk_score: 21,
        risk_score_mapping: [],
        severity: 'low',
        severity_mapping: [],
        threat: [],
        max_signals: 100,
        name: 'security-rule',
        description: 'security-rule',
        tags: ['security-rule'],
        setup: '',
        license: '',
        interval: '5s',
        from: 'now-10m',
        to: 'now',
        actions: [],
        enabled: true,
        meta: {
          kibana_siem_app_url: 'http://localhost:5601/app/security',
        },
      })
      .expect(200);
    return createdRule;
  };

  async function waitForAlertDocs(
    index: string,
    ruleId: string,
    count: number = 1
  ): Promise<Array<SearchHit<AlertDoc>>> {
    return await retry.try(async () => {
      const searchResult = await es.search<AlertDoc>({
        index,
        size: count,
        query: {
          bool: {
            must: [{ term: { 'kibana.alert.rule.uuid': ruleId } }],
          },
        },
      });

      const docs = searchResult.hits.hits as Array<SearchHit<AlertDoc>>;
      if (docs.length < count) throw new Error(`only ${docs.length} out of ${count} docs found`);

      return docs;
    });
  }

  const getAlertFieldsByFeatureId = async (
    user: User,
    ruleTypeIds: string[],
    spaceId: string = 'default',
    expectedStatusCode: number = 200
  ) => {
    const resp = await supertestWithoutAuth
      .get(`${getSpaceUrlPrefix(spaceId)}${TEST_URL}`)
      .query({ rule_type_ids: ruleTypeIds })
      .auth(user.username, user.password)
      .set('kbn-xsrf', 'true')
      .expect(expectedStatusCode);

    return resp.body;
  };

  const getSampleWebLogsDataView = async () => {
    const { body } = await supertest
      .post(`/api/content_management/rpc/search`)
      .set('kbn-xsrf', 'foo')
      .send({
        contentTypeId: 'index-pattern',
        query: { limit: 10 },
        version: 1,
      })
      .expect(200);
    return body.result.result.hits.find(
      (dataView: { attributes: { title: string } }) =>
        dataView.attributes.title === 'kibana_sample_data_logs'
    );
  };

  const deleteRule = async (ruleId: string, spaceId: string = 'default') => {
    await supertest
      .delete(`${getSpaceUrlPrefix(spaceId)}/api/alerting/rule/${ruleId}`)
      .set('kbn-xsrf', 'foo')
      .expect(204);
  };

  const verifyFields = (
    fields: FieldDescriptor[],
    allowedPrefixes: string[],
    notAllowedPrefixes: string[] = []
  ) => {
    // Check at least one of each prefix exists
    allowedPrefixes.forEach((prefix) => {
      expect(
        fields.some((field) => {
          return field.name.startsWith(prefix);
        })
      ).toBeTruthy();
    });

    notAllowedPrefixes.forEach((prefix) => {
      // Check no fields with these prefixes exist
      expect(
        fields.some((field) => {
          return field.name.startsWith(prefix);
        })
      ).toBeFalsy();
    });
  };

  const verifyBaseFields = (fields: FieldDescriptor[], requiredFieldNames: string[] = []) => {
    const defaultRequiredFieldNames = ['@timestamp', '_id', '_index'];
    const allRequiredFieldNames =
      requiredFieldNames?.length > 0 ? requiredFieldNames : defaultRequiredFieldNames;

    allRequiredFieldNames.forEach((fieldName) => {
      expect(fields.some((field) => field.name === fieldName)).toBeTruthy();
    });
  };

  describe('Alert - Get alert fields by rule type IDs', () => {
    const ruleTypeIds = [
      ...OBSERVABILITY_RULE_TYPE_IDS,
      '.es-query',
      'xpack.ml.anomaly_detection_alert',
    ];

    let stackRuleId: string;
    let securityRuleId: string;

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/rule_registry/alerts');
      await supertest
        .post(`/api/sample_data/logs`)
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'foo')
        .expect(200);

      const dataView = await getSampleWebLogsDataView();
      const [securityRule, stackRule] = await Promise.all([
        createSecurityRule(dataView.id),
        createEsQueryRule(),
      ]);

      securityRuleId = securityRule.id;
      stackRuleId = stackRule.id;

      await waitForAlertDocs('.alerts-security.alerts-default', securityRuleId, 1);
      await waitForAlertDocs('.alerts-stack.alerts-default', stackRuleId, 1);
    });

    after(async () => {
      await deleteRule(stackRuleId);
      await supertest
        .post(`/api/detection_engine/rules/_bulk_action?dry_run=false`)
        .set('kbn-xsrf', 'foo')
        .send({
          action: 'delete',
          ids: [securityRuleId],
        })
        .expect(200);
      await supertest
        .delete(`/api/sample_data/logs`)
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'foo')
        .expect(204);
      await esArchiver.unload('x-pack/test/functional/es_archives/rule_registry/alerts');
    });

    describe('Users:', () => {
      it(`${superUser.username} should be able to get alert fields for all rule types`, async () => {
        const resp = await getAlertFieldsByFeatureId(superUser, []);

        verifyBaseFields(resp.fields);
        verifyFields(resp.fields, ['event', 'kibana', 'signal'], []);
      });

      it(`${superUser.username} should be able to get alert fields for o11y rule types`, async () => {
        const resp = await getAlertFieldsByFeatureId(superUser, ruleTypeIds);

        verifyBaseFields(resp.fields);
        verifyFields(resp.fields, ['event', 'kibana'], ['signal']);
      });

      it(`${superUser.username} should be able to get alert fields for siem rule types`, async () => {
        const resp = await getAlertFieldsByFeatureId(superUser, [
          'siem.queryRule',
          'siem.esqlRule',
        ]);

        verifyBaseFields(resp.fields);
        verifyFields(resp.fields, ['event', 'kibana', 'signal'], []);
      });

      it(`${obsOnlySpacesAll.username} should be able to get non empty alert fields for o11y ruleTypeIds`, async () => {
        const resp = await getAlertFieldsByFeatureId(obsOnlySpacesAll, ruleTypeIds);

        verifyBaseFields(resp.fields);
        verifyFields(resp.fields, ['event', 'kibana'], ['signal']);
      });

      it(`${obsOnlySpacesAll.username} should be able to get non empty alert fields for all ruleTypeIds`, async () => {
        const resp = await getAlertFieldsByFeatureId(obsOnlySpacesAll, []);

        verifyBaseFields(resp.fields);
        verifyFields(resp.fields, ['event', 'kibana'], ['signal']);
      });

      it(`${obsOnlySpacesAll.username} should not be able to get non empty alert fields for siem ruleTypeIds`, async () => {
        const resp = await getAlertFieldsByFeatureId(obsOnlySpacesAll, [
          'siem.queryRule',
          'siem.esqlRule',
        ]);

        verifyFields(resp.fields, [], ['event', 'kibana', 'signal']);
      });

      it(`${obsOnlyReadSpacesAll.username} should be able to get non empty alert fields for o11y ruleTypeIds`, async () => {
        const resp = await getAlertFieldsByFeatureId(obsOnlyReadSpacesAll, ruleTypeIds);

        verifyBaseFields(resp.fields);
        verifyFields(resp.fields, ['event', 'kibana'], ['signal']);
      });

      it(`${obsOnlyReadSpacesAll.username} should be able to get non empty alert fields for all ruleTypeIds`, async () => {
        const resp = await getAlertFieldsByFeatureId(obsOnlyReadSpacesAll, []);

        verifyBaseFields(resp.fields);
        verifyFields(resp.fields, ['event', 'kibana'], ['signal']);
      });

      it(`${obsOnlyReadSpacesAll.username} should not be able to get non empty alert fields for siem ruleTypeIds`, async () => {
        const resp = await getAlertFieldsByFeatureId(obsOnlyReadSpacesAll, [
          'siem.queryRule',
          'siem.esqlRule',
        ]);

        verifyFields(resp.fields, [], ['event', 'kibana', 'signal']);
      });

      it(`${secOnlySpacesAllEsReadAll.username} should be able to get alert fields for siem rule types`, async () => {
        const resp = await getAlertFieldsByFeatureId(secOnlySpacesAllEsReadAll, ['siem.queryRule']);

        verifyBaseFields(resp.fields);
        verifyFields(resp.fields, ['event', 'kibana', 'signal'], []);
      });

      it(`${secOnlySpacesAllEsReadAll.username} should be able to get alert fields for all rule types`, async () => {
        const resp = await getAlertFieldsByFeatureId(secOnlySpacesAllEsReadAll, []);

        verifyBaseFields(resp.fields);
        verifyFields(resp.fields, ['event', 'kibana', 'signal'], []);
      });

      it(`${secOnlySpacesAllEsReadAll.username} should not be able to get alert fields for o11y rule types`, async () => {
        const resp = await getAlertFieldsByFeatureId(secOnlySpacesAllEsReadAll, ruleTypeIds);

        verifyFields(resp.fields, [], ['event', 'kibana', 'signal']);
      });

      it(`${secOnlySpaces2EsReadAll.username} should NOT be able to get alert fields for siem rule types due to space restrictions`, async () => {
        await getAlertFieldsByFeatureId(secOnlySpaces2EsReadAll, ['siem.queryRule'], 'space2', 401);
      });

      it(`${secOnlyReadSpacesAll.username} should get empty alert fields for siem rule types due to lack of ES access`, async () => {
        const resp = await getAlertFieldsByFeatureId(secOnlyReadSpacesAll, ['siem.queryRule']);

        verifyFields(resp.fields, [], ['event', 'kibana', 'signal']);
      });

      it(`${noKibanaPrivileges.username} should NOT be able to get alert fields`, async () => {
        await getAlertFieldsByFeatureId(noKibanaPrivileges, [], '', 403);
      });
    });
  });
};
