/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '@kbn/alerting-plugin/server/saved_objects';
import type { Agent as SupertestAgent } from 'supertest';

import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import { Superuser } from '../../security_and_spaces/scenarios';

const SAMPLE_V1_TEMPLATE_ID = 'sample-alerting-rule';
const SAMPLE_V2_TEMPLATE_ID = 'sample-alerting-rule-engine-v2';

export async function createRuleTemplateSO(
  ftrProvider: FtrProviderContext,
  { space = 'default' }: { space?: string } = {}
) {
  return await ftrProvider.getService('es').index({
    index: '.kibana_alerting_cases',
    id: `${RULE_TEMPLATE_SAVED_OBJECT_TYPE}:${SAMPLE_V1_TEMPLATE_ID}`,
    document: {
      alerting_rule_template: {
        name: 'Sample alerting rule template v2',
        tags: ['Testing'],
        description: 'This is a sample alerting rule template description',
        artifacts: {
          dashboards: [{ id: 'dash-1' }],
          investigation_guide: { blob: 'text' },
        },
        ruleTypeId: '.index-threshold',
        schedule: {
          interval: '1m',
        },
        params: {
          aggType: 'count',
          termSize: 5,
          thresholdComparator: '>',
          timeWindowSize: 5,
          timeWindowUnit: 'm',
          groupBy: 'all',
          threshold: [1000],
          index: ['logs-test-default'],
          timeField: '@timestamp',
        },
        alertDelay: {
          active: 1,
        },
      },
      type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
      references: [],
      managed: false,
      namespaces: [space],
      coreMigrationVersion: '8.8.0',
      typeMigrationVersion: '10.1.0',
      updated_at: '2025-09-09T09:57:45.733Z',
      created_at: '2025-09-09T09:57:45.733Z',
    },
    refresh: 'wait_for',
  });
}

/**
 * Indexes an alerting-v2 shaped rule template SO directly (bypassing Fleet/SO APIs).
 * Used to assert v1 find APIs exclude `engine: "v2"` documents.
 */
export async function createAlertingV2RuleTemplateSO(
  ftrProvider: FtrProviderContext,
  { space = 'default' }: { space?: string } = {}
) {
  return await ftrProvider.getService('es').index({
    index: '.kibana_alerting_cases',
    id: `${RULE_TEMPLATE_SAVED_OBJECT_TYPE}:${SAMPLE_V2_TEMPLATE_ID}`,
    document: {
      alerting_rule_template: {
        engine: 'v2',
        rule: {
          kind: 'alert',
          metadata: {
            name: 'Sample alerting v2 rule template',
            description: 'Should be excluded from v1 find results',
            tags: ['Testing', 'v2'],
          },
          schedule: {
            every: '1m',
            lookback: '15m',
          },
          query: {
            format: 'composed',
            base: 'FROM logs-*',
            breach: {
              segment: '| WHERE true',
            },
          },
          time_field: '@timestamp',
        },
      },
      type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
      references: [],
      managed: false,
      namespaces: [space],
      coreMigrationVersion: '8.8.0',
      typeMigrationVersion: '10.4.0',
      updated_at: '2025-09-09T09:57:45.733Z',
      created_at: '2025-09-09T09:57:45.733Z',
    },
    refresh: 'wait_for',
  });
}

export { SAMPLE_V1_TEMPLATE_ID, SAMPLE_V2_TEMPLATE_ID };

export async function deleteRuleTemplateByESQuery(ftrProvider: FtrProviderContext) {
  const es = ftrProvider.getService('es');
  await es.deleteByQuery({
    index: '.kibana_alerting_cases',
    q: `type:${RULE_TEMPLATE_SAVED_OBJECT_TYPE}`,
    wait_for_completion: true,
    refresh: true,
    body: {},
    conflicts: 'proceed',
  });
}

export function getRuleTemplate({
  supertest,
  templateId,
  auth = { user: Superuser, space: null },
}: {
  supertest: SupertestAgent;
  templateId: string;
  auth?: { user: { username: string; password: string }; space: string | null };
}) {
  return supertest
    .get(`${auth.space ? `/s/${auth.space}` : ''}/internal/alerting/rule_template/${templateId}`)
    .set('kbn-xsrf', 'true')
    .auth(auth.user.username, auth.user.password)
    .send();
}

export function findRuleTemplates({
  supertest,
  query = {},
  auth = { user: Superuser, space: null },
}: {
  supertest: SupertestAgent;
  query?: Record<string, string | number | string[]>;
  auth?: { user: { username: string; password: string }; space: string | null };
}) {
  return supertest
    .get(`${auth.space ? `/s/${auth.space}` : ''}/internal/alerting/rule_template/_find`)
    .query(query)
    .set('kbn-xsrf', 'true')
    .auth(auth.user.username, auth.user.password)
    .send();
}

export function getRuleTemplateResponse(id: string) {
  return {
    id,
    name: 'Sample alerting rule template v2',
    params: {
      aggType: 'count',
      termSize: 5,
      thresholdComparator: '>',
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      groupBy: 'all',
      threshold: [1000],
      index: ['logs-test-default'],
      timeField: '@timestamp',
    },
    rule_type_id: '.index-threshold',
    schedule: { interval: '1m' },
    tags: ['Testing'],
    alert_delay: { active: 1 },
  };
}
