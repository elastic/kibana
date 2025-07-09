/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function RulesAPIServiceProvider({ getService }: FtrProviderContext) {
  const kbnSupertest = getService('supertest');
  const log = getService('log');

  return {
    async createRule({
      consumer,
      name,
      notifyWhen,
      params,
      ruleTypeId,
      schedule,
      actions = [],
    }: {
      consumer: string;
      name: string;
      notifyWhen?: string;
      params: Record<string, unknown>;
      ruleTypeId: string;
      schedule: Record<string, unknown>;
      actions?: any[];
    }) {
      log.debug(`Create basic rule...`);
      const { body: createdRule } = await kbnSupertest
        .post(`/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send({
          consumer,
          name,
          notify_when: notifyWhen,
          params,
          rule_type_id: ruleTypeId,
          schedule,
          actions,
        })
        .expect(200);
      return createdRule;
    },

    async deleteRule(id: string) {
      log.debug(`Deleting rule with id '${id}'...`);
      const rsp = kbnSupertest
        .delete(`/api/alerting/rule/${id}`)
        .set('kbn-xsrf', 'foo')
        .expect(204, '');
      log.debug('> Rule deleted.');
      return rsp;
    },

    async deleteAllRules(additionalRequestHeaders?: object) {
      log.debug(`Deleting all rules...`);
      const { body } = await kbnSupertest
        .get(`/api/alerting/rules/_find`)
        .set({ ...additionalRequestHeaders, 'kbn-xsrf': 'foo' })
        .expect(200);

      for (const rule of body.data) {
        await this.deleteRule(rule.id);
      }
    },
  };
}
