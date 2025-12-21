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

export async function createRuleTemplateSO(
  ftrProvider: FtrProviderContext,
  { space = 'default' }: { space?: string } = {}
) {
  return await ftrProvider.getService('es').index({
    index: '.kibana_alerting_cases',
    id: `${RULE_TEMPLATE_SAVED_OBJECT_TYPE}:sample-alerting-rule`,
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
