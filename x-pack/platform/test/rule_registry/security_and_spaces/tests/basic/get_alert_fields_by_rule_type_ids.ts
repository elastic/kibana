/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { OBSERVABILITY_RULE_TYPE_IDS } from '@kbn/rule-data-utils';
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
import { getEventLog } from '../../../../alerting_api_integration/common/lib';
import type { User } from '../../../common/lib/authentication/types';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import { getSpaceUrlPrefix } from '../../../common/lib/authentication/spaces';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');
  const retry = getService('retry');

  const TEST_URL = '/internal/rac/alerts/fields';

  describe('Alert - Get alert fields by rule type IDs', () => {
    const ruleTypeIds = [
      ...OBSERVABILITY_RULE_TYPE_IDS,
      '.es-query',
      'xpack.ml.anomaly_detection_alert',
    ];

    let stackRuleId: string;
    let securityRuleId: string;

    before(async () => {
      await esArchiver.load(
        'x-pack/solutions/observability/test/fixtures/es_archives/observability/alerts'
      );
      await esArchiver.load(
        'x-pack/solutions/security/test/fixtures/es_archives/security_solution/alerts/8.1.0'
      );

      await installKibanaSampleData();

      const [securityRule, stackRule] = await Promise.all([
        createSecurityRule(),
        createEsQueryRule(),
      ]);

      securityRuleId = securityRule.id;
      stackRuleId = stackRule.id;

      await waitForRuleToExecute(stackRuleId);
      await waitForRuleToExecute(securityRuleId);
    });

    after(async () => {
      await supertest
        .delete(`/api/alerting/rule/${stackRuleId}`)
        .set('kbn-xsrf', 'foo')
        .expect(204);

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

      await esArchiver.unload(
        'x-pack/solutions/observability/test/fixtures/es_archives/observability/alerts'
      );
      await esArchiver.unload(
        'x-pack/solutions/security/test/fixtures/es_archives/security_solution/alerts/8.1.0'
      );
    });

    describe('Users:', () => {
      it(`${superUser.username} should be able to get alert fields for all rule types`, async () => {
        const resp = await getAlertFieldsByFeatureId(superUser, []);

        verifyBaseFields(resp.fields);
        verifyFields({
          fields: resp.fields,
          allowedPrefixes: ['event', 'kibana', 'signal'],
          notAllowedPrefixes: [],
        });
      });

      it(`${superUser.username} should be able to get alert fields for o11y rule types`, async () => {
        const resp = await getAlertFieldsByFeatureId(superUser, ruleTypeIds);

        verifyBaseFields(resp.fields);
        verifyFields({
          fields: resp.fields,
          allowedPrefixes: ['event', 'kibana'],
          notAllowedPrefixes: ['signal'],
        });
      });

      it(`${superUser.username} should be able to get alert fields for siem rule types`, async () => {
        const resp = await getAlertFieldsByFeatureId(superUser, [
          'siem.queryRule',
          'siem.esqlRule',
        ]);

        verifyBaseFields(resp.fields);
        verifyFields({
          fields: resp.fields,
          allowedPrefixes: ['event', 'kibana', 'signal'],
          notAllowedPrefixes: [],
        });
      });

      it(`${obsOnlySpacesAll.username} should be able to get non empty alert fields for o11y ruleTypeIds`, async () => {
        const resp = await getAlertFieldsByFeatureId(obsOnlySpacesAll, ruleTypeIds);

        verifyBaseFields(resp.fields);
        verifyFields({
          fields: resp.fields,
          allowedPrefixes: ['event', 'kibana'],
          notAllowedPrefixes: ['signal'],
        });
      });

      it(`${obsOnlySpacesAll.username} should be able to get non empty alert fields for all ruleTypeIds`, async () => {
        const resp = await getAlertFieldsByFeatureId(obsOnlySpacesAll, []);

        verifyBaseFields(resp.fields);
        verifyFields({
          fields: resp.fields,
          allowedPrefixes: ['event', 'kibana'],
          notAllowedPrefixes: ['signal'],
        });
      });

      it(`${obsOnlySpacesAll.username} should not be able to get non empty alert fields for siem ruleTypeIds`, async () => {
        const resp = await getAlertFieldsByFeatureId(obsOnlySpacesAll, [
          'siem.queryRule',
          'siem.esqlRule',
        ]);

        verifyFields({
          fields: resp.fields,
          allowedPrefixes: [],
          notAllowedPrefixes: ['event', 'kibana', 'signal'],
        });
      });

      it(`${obsOnlySpacesAll.username} should be able to get only o11y non empty alert fields for siem and o11y ruleTypeIds`, async () => {
        const resp = await getAlertFieldsByFeatureId(obsOnlySpacesAll, [
          ...ruleTypeIds,
          'siem.queryRule',
          'siem.esqlRule',
        ]);

        verifyFields({
          fields: resp.fields,
          allowedPrefixes: ['event', 'kibana'],
          notAllowedPrefixes: ['signal'],
        });
      });

      it(`${obsOnlyReadSpacesAll.username} should be able to get non empty alert fields for o11y ruleTypeIds`, async () => {
        const resp = await getAlertFieldsByFeatureId(obsOnlyReadSpacesAll, ruleTypeIds);

        verifyBaseFields(resp.fields);
        verifyFields({
          fields: resp.fields,
          allowedPrefixes: ['event', 'kibana'],
          notAllowedPrefixes: ['signal'],
        });
      });

      it(`${obsOnlyReadSpacesAll.username} should be able to get non empty alert fields for all ruleTypeIds`, async () => {
        const resp = await getAlertFieldsByFeatureId(obsOnlyReadSpacesAll, []);

        verifyBaseFields(resp.fields);
        verifyFields({
          fields: resp.fields,
          allowedPrefixes: ['event', 'kibana'],
          notAllowedPrefixes: ['signal'],
        });
      });

      it(`${obsOnlyReadSpacesAll.username} should not be able to get non empty alert fields for siem ruleTypeIds`, async () => {
        const resp = await getAlertFieldsByFeatureId(obsOnlyReadSpacesAll, [
          'siem.queryRule',
          'siem.esqlRule',
        ]);

        verifyFields({
          fields: resp.fields,
          allowedPrefixes: [],
          notAllowedPrefixes: ['event', 'kibana', 'signal'],
        });
      });

      it(`${secOnlySpacesAllEsReadAll.username} should be able to get alert fields for siem rule types`, async () => {
        const resp = await getAlertFieldsByFeatureId(secOnlySpacesAllEsReadAll, ['siem.queryRule']);

        verifyBaseFields(resp.fields);
        verifyFields({
          fields: resp.fields,
          allowedPrefixes: ['event', 'kibana', 'signal'],
          notAllowedPrefixes: [],
        });
      });

      it(`${secOnlySpacesAllEsReadAll.username} should be able to get alert fields for all rule types`, async () => {
        const resp = await getAlertFieldsByFeatureId(secOnlySpacesAllEsReadAll, []);

        verifyBaseFields(resp.fields);
        verifyFields({
          fields: resp.fields,
          allowedPrefixes: ['event', 'kibana', 'signal'],
          notAllowedPrefixes: [],
        });
      });

      it(`${secOnlySpacesAllEsReadAll.username} should not be able to get alert fields for o11y rule types`, async () => {
        const resp = await getAlertFieldsByFeatureId(secOnlySpacesAllEsReadAll, ruleTypeIds);

        verifyFields({
          fields: resp.fields,
          allowedPrefixes: [],
          notAllowedPrefixes: ['event', 'kibana', 'signal'],
        });
      });

      it(`${secOnlySpaces2EsReadAll.username} should NOT be able to get alert fields for siem rule types due to space restrictions`, async () => {
        await getAlertFieldsByFeatureId(secOnlySpaces2EsReadAll, ['siem.queryRule'], 'space2', 401);
      });

      it(`${secOnlyReadSpacesAll.username} should get empty alert fields for siem rule types due to lack of ES access`, async () => {
        const resp = await getAlertFieldsByFeatureId(secOnlyReadSpacesAll, ['siem.queryRule']);

        verifyFields({
          fields: resp.fields,
          allowedPrefixes: [],
          notAllowedPrefixes: ['event', 'kibana', 'signal'],
        });
      });

      it(`${noKibanaPrivileges.username} should NOT be able to get alert fields`, async () => {
        await getAlertFieldsByFeatureId(noKibanaPrivileges, [], '', 403);
      });
    });
  });

  const installKibanaSampleData = async () => {
    await supertest
      .post(`/api/sample_data/logs`)
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'Kibana')
      .expect(200);
  };

  const createEsQueryRule = async () => {
    const name = 'stack-rule';
    const { body: createdRule } = await supertest
      .post('/api/alerting/rule')
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

  const createSecurityRule = async () => {
    const { body: createdRule } = await supertest
      .post('/api/detection_engine/rules')
      .set('kbn-xsrf', 'foo')
      .send({
        name: `spammy_rule`,
        description: 'Spammy query rule',
        enabled: true,
        risk_score: 1,
        rule_id: 'rule-1',
        severity: 'low',
        type: 'query',
        query: '_id: *',
        index: ['kibana_sample_data_logs'],
        from: 'now-1y',
        interval: '1m',
      })
      .expect(200);

    return createdRule;
  };

  const waitForRuleToExecute = async (ruleId: string) => {
    await retry.try(async () => {
      return await getEventLog({
        getService,
        spaceId: 'default',
        type: 'alert',
        id: ruleId,
        provider: 'alerting',
        actions: new Map([['execute', { gte: 1 }]]),
      });
    });
  };

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

  const verifyFields = ({
    fields,
    allowedPrefixes,
    notAllowedPrefixes = [],
  }: {
    fields: FieldDescriptor[];
    allowedPrefixes: string[];
    notAllowedPrefixes: string[];
  }) => {
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
};
