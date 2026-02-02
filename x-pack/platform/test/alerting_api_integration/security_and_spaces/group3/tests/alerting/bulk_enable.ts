/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ALERT_FLAPPING, ALERT_FLAPPING_HISTORY, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { setTimeout as setTimeoutAsync } from 'timers/promises';
import { RuleNotifyWhen } from '@kbn/alerting-types';
import type { SearchHit } from '@kbn/es-types';
import type { Alert } from '@kbn/alerts-as-data-utils';
import type { String } from 'lodash';
import {
  UserAtSpaceScenarios,
  SuperuserAtSpace1,
  EnableDisableOnlyUserAtSpace1,
} from '../../../scenarios';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  getUrlPrefix,
  getTestRuleData,
  ObjectRemover,
  getUnauthorizedErrorMessage,
  resetRulesSettings,
} from '../../../../common/lib';

const defaultSuccessfulResponse = {
  total: 1,
  rules: [],
  errors: [],
  task_ids_failed_to_be_enabled: [],
};

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const es = getService('es');
  const retry = getService('retry');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('bulkEnableRules', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(() => objectRemover.removeAll());

    const getScheduledTask = async (id: string) => {
      return await es.get({
        id: `task:${id}`,
        index: '.kibana_task_manager',
      });
    };

    const ScenariosToTest = [...UserAtSpaceScenarios, EnableDisableOnlyUserAtSpace1];

    for (const scenario of ScenariosToTest) {
      const { user, space } = scenario;

      describe(scenario.id, () => {
        it('should handle bulk enable of one rule appropriately based on id', async () => {
          const { body: createdRule } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send({ ...getTestRuleData(), enabled: false })
            .expect(200);
          objectRemover.add(space.id, createdRule.id, 'rule', 'alerting');

          const response = await supertestWithoutAuth
            .patch(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_enable`)
            .set('kbn-xsrf', 'foo')
            .send({ ids: [createdRule.id] })
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: 'Unauthorized to find rules for any rule types',
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              break;
            case 'global_read at space1':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage('bulkEnable', 'test.noop', 'alertsFixture'),
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              break;
            case 'space_1_all_alerts_none_actions at space1':
            case 'superuser at space1':
            case 'enable_disable_only at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body).to.eql({
                total: 1,
                rules: [
                  {
                    id: response.body.rules[0].id,
                    notify_when: 'onThrottleInterval',
                    enabled: true,
                    name: 'abc',
                    tags: ['foo'],
                    consumer: 'alertsFixture',
                    throttle: '1m',
                    rule_type_id: 'test.noop',
                    api_key_created_by_user: false,
                    api_key_owner: response.body.rules[0].api_key_owner,
                    created_by: 'elastic',
                    updated_by: response.body.rules[0].updated_by,
                    mute_all: false,
                    muted_alert_ids: [],
                    schedule: { interval: '1m' },
                    actions: [],
                    params: {},
                    running: false,
                    snooze_schedule: [],
                    updated_at: response.body.rules[0].updated_at,
                    created_at: response.body.rules[0].created_at,
                    revision: 0,
                    scheduled_task_id: response.body.rules[0].scheduled_task_id,
                    execution_status: {
                      last_duration: 0,
                      last_execution_date:
                        response.body.rules[0].execution_status.last_execution_date,
                      status: 'pending',
                    },
                    monitoring: response.body.rules[0].monitoring,
                  },
                ],
                errors: [],
                task_ids_failed_to_be_enabled: [],
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle bulk enable of one rule appropriately based on id when consumer is the same as producer', async () => {
          const { body: createdRule } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.restricted-noop',
                consumer: 'alertsRestrictedFixture',
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdRule.id, 'rule', 'alerting');

          const response = await supertestWithoutAuth
            .patch(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_enable`)
            .set('kbn-xsrf', 'foo')
            .send({ ids: [createdRule.id] })
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: 'Unauthorized to find rules for any rule types',
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              break;
            case 'global_read at space1':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage(
                  'bulkEnable',
                  'test.restricted-noop',
                  'alertsRestrictedFixture'
                ),
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              break;
            case 'space_1_all at space1':
            case 'enable_disable_only at space1':
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: 'No rules found for bulk enable',
              });
              expect(response.statusCode).to.eql(400);
              break;
            case 'superuser at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.body).to.eql({
                ...defaultSuccessfulResponse,
                rules: [
                  {
                    id: response.body.rules[0].id,
                    notify_when: 'onThrottleInterval',
                    enabled: true,
                    name: 'abc',
                    tags: ['foo'],
                    consumer: 'alertsRestrictedFixture',
                    throttle: '1m',
                    rule_type_id: 'test.restricted-noop',
                    api_key_created_by_user: false,
                    api_key_owner: response.body.rules[0].api_key_owner,
                    created_by: 'elastic',
                    updated_by: response.body.rules[0].updated_by,
                    mute_all: false,
                    muted_alert_ids: [],
                    schedule: { interval: '1m' },
                    actions: [],
                    params: {},
                    running: false,
                    snooze_schedule: [],
                    updated_at: response.body.rules[0].updated_at,
                    created_at: response.body.rules[0].created_at,
                    revision: 0,
                    scheduled_task_id: response.body.rules[0].scheduled_task_id,
                    ...(response.body.rules[0].last_run
                      ? { last_run: response.body.rules[0].last_run }
                      : {}),
                    execution_status: {
                      last_duration: 0,
                      last_execution_date:
                        response.body.rules[0].execution_status.last_execution_date,
                      status: 'pending',
                    },
                    ...(response.body.rules[0].next_run
                      ? { next_run: response.body.rules[0].next_run }
                      : {}),
                    monitoring: response.body.rules[0].monitoring,
                  },
                ],
              });
              expect(response.statusCode).to.eql(200);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle enable alert request appropriately when consumer is "alerts"', async () => {
          const { body: createdRule } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.noop',
                consumer: 'alerts',
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdRule.id, 'rule', 'alerting');

          const response = await supertestWithoutAuth
            .patch(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_enable`)
            .set('kbn-xsrf', 'foo')
            .send({ ids: [createdRule.id] })
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: 'Unauthorized to find rules for any rule types',
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              break;
            case 'global_read at space1':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage('bulkEnable', 'test.noop', 'alerts'),
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'enable_disable_only at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.body).to.eql({
                ...defaultSuccessfulResponse,
                rules: [
                  {
                    id: response.body.rules[0].id,
                    notify_when: 'onThrottleInterval',
                    enabled: true,
                    name: 'abc',
                    tags: ['foo'],
                    consumer: 'alerts',
                    throttle: '1m',
                    rule_type_id: 'test.noop',
                    api_key_created_by_user: false,
                    api_key_owner: response.body.rules[0].api_key_owner,
                    created_by: 'elastic',
                    updated_by: response.body.rules[0].updated_by,
                    mute_all: false,
                    muted_alert_ids: [],
                    schedule: { interval: '1m' },
                    actions: [],
                    params: {},
                    running: false,
                    snooze_schedule: [],
                    updated_at: response.body.rules[0].updated_at,
                    created_at: response.body.rules[0].created_at,
                    revision: 0,
                    scheduled_task_id: response.body.rules[0].scheduled_task_id,
                    ...(response.body.rules[0].last_run
                      ? { last_run: response.body.rules[0].last_run }
                      : {}),
                    execution_status: {
                      last_duration: 0,
                      last_execution_date:
                        response.body.rules[0].execution_status.last_execution_date,
                      status: 'pending',
                    },
                    ...(response.body.rules[0].next_run
                      ? { next_run: response.body.rules[0].next_run }
                      : {}),
                    monitoring: response.body.rules[0].monitoring,
                  },
                ],
              });
              expect(response.statusCode).to.eql(200);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle bulk enable of several rules ids appropriately based on ids', async () => {
          const rules = await Promise.all(
            Array.from({ length: 3 }).map(() =>
              supertest
                .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
                .set('kbn-xsrf', 'foo')
                .send(getTestRuleData({ tags: ['multiple-rules-edit-with-ids'] }))
                .expect(200)
            )
          );
          rules.map((rule) => {
            objectRemover.add(space.id, rule.body.id, 'rule', 'alerting');
          });

          const response = await supertestWithoutAuth
            .patch(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_enable`)
            .set('kbn-xsrf', 'foo')
            .send({ ids: rules.map((rule) => rule.body.id) })
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: 'Unauthorized to find rules for any rule types',
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              break;
            case 'global_read at space1':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage('bulkEnable', 'test.noop', 'alertsFixture'),
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              break;
            case 'space_1_all_alerts_none_actions at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'enable_disable_only at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.body).to.eql({
                ...defaultSuccessfulResponse,
                rules: [
                  {
                    id: response.body.rules[0].id,
                    notify_when: 'onThrottleInterval',
                    enabled: true,
                    name: 'abc',
                    tags: ['multiple-rules-edit-with-ids'],
                    consumer: 'alertsFixture',
                    throttle: '1m',
                    rule_type_id: 'test.noop',
                    api_key_created_by_user: false,
                    api_key_owner: response.body.rules[0].api_key_owner,
                    created_by: 'elastic',
                    updated_by: response.body.rules[0].updated_by,
                    mute_all: false,
                    muted_alert_ids: [],
                    schedule: { interval: '1m' },
                    actions: [],
                    params: {},
                    running: false,
                    snooze_schedule: [],
                    updated_at: response.body.rules[0].updated_at,
                    created_at: response.body.rules[0].created_at,
                    revision: 0,
                    scheduled_task_id: response.body.rules[0].scheduled_task_id,
                    ...(response.body.rules[0].last_run
                      ? { last_run: response.body.rules[0].last_run }
                      : {}),
                    execution_status: {
                      last_duration: 0,
                      last_execution_date:
                        response.body.rules[0].execution_status.last_execution_date,
                      status: 'pending',
                    },
                    ...(response.body.rules[0].next_run
                      ? { next_run: response.body.rules[0].next_run }
                      : {}),
                    monitoring: response.body.rules[0].monitoring,
                  },
                  {
                    id: response.body.rules[1].id,
                    notify_when: 'onThrottleInterval',
                    enabled: true,
                    name: 'abc',
                    tags: ['multiple-rules-edit-with-ids'],
                    consumer: 'alertsFixture',
                    throttle: '1m',
                    rule_type_id: 'test.noop',
                    api_key_created_by_user: false,
                    api_key_owner: response.body.rules[1].api_key_owner,
                    created_by: 'elastic',
                    updated_by: response.body.rules[1].updated_by,
                    mute_all: false,
                    muted_alert_ids: [],
                    schedule: { interval: '1m' },
                    actions: [],
                    params: {},
                    running: false,
                    snooze_schedule: [],
                    updated_at: response.body.rules[1].updated_at,
                    created_at: response.body.rules[1].created_at,
                    revision: 0,
                    scheduled_task_id: response.body.rules[1].scheduled_task_id,
                    ...(response.body.rules[1].last_run
                      ? { last_run: response.body.rules[1].last_run }
                      : {}),
                    execution_status: {
                      last_duration: 0,
                      last_execution_date:
                        response.body.rules[1].execution_status.last_execution_date,
                      status: 'pending',
                    },
                    ...(response.body.rules[1].next_run
                      ? { next_run: response.body.rules[1].next_run }
                      : {}),
                    monitoring: response.body.rules[1].monitoring,
                  },
                  {
                    id: response.body.rules[2].id,
                    notify_when: 'onThrottleInterval',
                    enabled: true,
                    name: 'abc',
                    tags: ['multiple-rules-edit-with-ids'],
                    consumer: 'alertsFixture',
                    throttle: '1m',
                    rule_type_id: 'test.noop',
                    api_key_created_by_user: false,
                    api_key_owner: response.body.rules[2].api_key_owner,
                    created_by: 'elastic',
                    updated_by: response.body.rules[2].updated_by,
                    mute_all: false,
                    muted_alert_ids: [],
                    schedule: { interval: '1m' },
                    actions: [],
                    params: {},
                    running: false,
                    snooze_schedule: [],
                    updated_at: response.body.rules[2].updated_at,
                    created_at: response.body.rules[2].created_at,
                    revision: 0,
                    scheduled_task_id: response.body.rules[2].scheduled_task_id,
                    ...(response.body.rules[2].last_run
                      ? { last_run: response.body.rules[2].last_run }
                      : {}),
                    execution_status: {
                      last_duration: 0,
                      last_execution_date:
                        response.body.rules[2].execution_status.last_execution_date,
                      status: 'pending',
                    },
                    ...(response.body.rules[2].next_run
                      ? { next_run: response.body.rules[2].next_run }
                      : {}),
                    monitoring: response.body.rules[2].monitoring,
                  },
                ],
                total: 3,
              });
              expect(response.statusCode).to.eql(200);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle bulk enable of several rules ids appropriately based on filter', async () => {
          const rules = await Promise.all(
            Array.from({ length: 3 }).map(() =>
              supertest
                .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
                .set('kbn-xsrf', 'foo')
                .send(getTestRuleData({ tags: ['multiple-rules-edit-with-filter'] }))
                .expect(200)
            )
          );
          rules.map((rule) => {
            objectRemover.add(space.id, rule.body.id, 'rule', 'alerting');
          });

          const response = await supertestWithoutAuth
            .patch(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_enable`)
            .set('kbn-xsrf', 'foo')
            .send({ filter: `alert.attributes.tags: "multiple-rules-edit-with-filter"` })
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: 'Unauthorized to find rules for any rule types',
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              break;
            case 'global_read at space1':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage('bulkEnable', 'test.noop', 'alertsFixture'),
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              break;
            case 'space_1_all_alerts_none_actions at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'enable_disable_only at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.body).to.eql({
                ...defaultSuccessfulResponse,
                total: 3,
                rules: [
                  {
                    id: response.body.rules[0].id,
                    notify_when: 'onThrottleInterval',
                    enabled: true,
                    name: 'abc',
                    tags: ['multiple-rules-edit-with-filter'],
                    consumer: 'alertsFixture',
                    throttle: '1m',
                    rule_type_id: 'test.noop',
                    api_key_created_by_user: false,
                    api_key_owner: response.body.rules[0].api_key_owner,
                    created_by: 'elastic',
                    updated_by: response.body.rules[0].updated_by,
                    mute_all: false,
                    muted_alert_ids: [],
                    schedule: { interval: '1m' },
                    actions: [],
                    params: {},
                    running: false,
                    snooze_schedule: [],
                    updated_at: response.body.rules[0].updated_at,
                    created_at: response.body.rules[0].created_at,
                    revision: 0,
                    scheduled_task_id: response.body.rules[0].scheduled_task_id,
                    ...(response.body.rules[0].last_run
                      ? { last_run: response.body.rules[0].last_run }
                      : {}),
                    execution_status: {
                      last_duration: 0,
                      last_execution_date:
                        response.body.rules[0].execution_status.last_execution_date,
                      status: 'pending',
                    },
                    ...(response.body.rules[0].next_run
                      ? { next_run: response.body.rules[0].next_run }
                      : {}),
                    monitoring: response.body.rules[0].monitoring,
                  },
                  {
                    id: response.body.rules[1].id,
                    notify_when: 'onThrottleInterval',
                    enabled: true,
                    name: 'abc',
                    tags: ['multiple-rules-edit-with-filter'],
                    consumer: 'alertsFixture',
                    throttle: '1m',
                    rule_type_id: 'test.noop',
                    api_key_created_by_user: false,
                    api_key_owner: response.body.rules[1].api_key_owner,
                    created_by: 'elastic',
                    updated_by: response.body.rules[1].updated_by,
                    mute_all: false,
                    muted_alert_ids: [],
                    schedule: { interval: '1m' },
                    actions: [],
                    params: {},
                    running: false,
                    snooze_schedule: [],
                    updated_at: response.body.rules[1].updated_at,
                    created_at: response.body.rules[1].created_at,
                    revision: 0,
                    scheduled_task_id: response.body.rules[1].scheduled_task_id,
                    ...(response.body.rules[1].last_run
                      ? { last_run: response.body.rules[1].last_run }
                      : {}),
                    execution_status: {
                      last_duration: 0,
                      last_execution_date:
                        response.body.rules[1].execution_status.last_execution_date,
                      status: 'pending',
                    },
                    ...(response.body.rules[1].next_run
                      ? { next_run: response.body.rules[1].next_run }
                      : {}),
                    monitoring: response.body.rules[1].monitoring,
                  },
                  {
                    id: response.body.rules[2].id,
                    notify_when: 'onThrottleInterval',
                    enabled: true,
                    name: 'abc',
                    tags: ['multiple-rules-edit-with-filter'],
                    consumer: 'alertsFixture',
                    throttle: '1m',
                    rule_type_id: 'test.noop',
                    api_key_created_by_user: false,
                    api_key_owner: response.body.rules[2].api_key_owner,
                    created_by: 'elastic',
                    updated_by: response.body.rules[2].updated_by,
                    mute_all: false,
                    muted_alert_ids: [],
                    schedule: { interval: '1m' },
                    actions: [],
                    params: {},
                    running: false,
                    snooze_schedule: [],
                    updated_at: response.body.rules[2].updated_at,
                    created_at: response.body.rules[2].created_at,
                    revision: 0,
                    scheduled_task_id: response.body.rules[2].scheduled_task_id,
                    ...(response.body.rules[2].last_run
                      ? { last_run: response.body.rules[2].last_run }
                      : {}),
                    execution_status: {
                      last_duration: 0,
                      last_execution_date:
                        response.body.rules[2].execution_status.last_execution_date,
                      status: 'pending',
                    },
                    ...(response.body.rules[2].next_run
                      ? { next_run: response.body.rules[2].next_run }
                      : {}),
                    monitoring: response.body.rules[2].monitoring,
                  },
                ],
              });
              expect(response.statusCode).to.eql(200);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should not enable rule from another space', async () => {
          const { body: createdRule } = await supertest
            .post(`${getUrlPrefix('other')}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getTestRuleData())
            .expect(200);
          objectRemover.add('other', createdRule.id, 'rule', 'alerting');

          const response = await supertestWithoutAuth
            .patch(`${getUrlPrefix('other')}/internal/alerting/rules/_bulk_enable`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({ ids: [createdRule.id] });

          switch (scenario.id) {
            // This superuser has more privileges that we think
            case 'superuser at space1':
              expect(response.body).to.eql({
                ...defaultSuccessfulResponse,
                rules: [
                  {
                    id: response.body.rules[0].id,
                    notify_when: 'onThrottleInterval',
                    enabled: true,
                    name: 'abc',
                    tags: ['foo'],
                    consumer: 'alertsFixture',
                    throttle: '1m',
                    rule_type_id: 'test.noop',
                    api_key_created_by_user: false,
                    api_key_owner: response.body.rules[0].api_key_owner,
                    created_by: 'elastic',
                    updated_by: response.body.rules[0].updated_by,
                    mute_all: false,
                    muted_alert_ids: [],
                    schedule: { interval: '1m' },
                    actions: [],
                    params: {},
                    running: false,
                    snooze_schedule: [],
                    updated_at: response.body.rules[0].updated_at,
                    created_at: response.body.rules[0].created_at,
                    revision: 0,
                    scheduled_task_id: response.body.rules[0].scheduled_task_id,
                    ...(response.body.rules[0].last_run
                      ? { last_run: response.body.rules[0].last_run }
                      : {}),
                    execution_status: {
                      last_duration: 0,
                      last_execution_date:
                        response.body.rules[0].execution_status.last_execution_date,
                      status: 'pending',
                    },
                    ...(response.body.rules[0].next_run
                      ? { next_run: response.body.rules[0].next_run }
                      : {}),
                    monitoring: response.body.rules[0].monitoring,
                  },
                ],
              });
              expect(response.statusCode).to.eql(200);
              break;
            case 'global_read at space1':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage('bulkEnable', 'test.noop', 'alertsFixture'),
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              await getScheduledTask(createdRule.scheduled_task_id);
              break;
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'space_1_all at space1':
            case 'enable_disable_only at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: 'Unauthorized to find rules for any rule types',
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              expect(response.statusCode).to.eql(403);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }

    describe('Clearing flapping tests', () => {
      const { user, space } = SuperuserAtSpace1;
      const alertsAsDataIndex = '.alerts-test.patternfiring.alerts-default';
      const TEST_CACHE_EXPIRATION_TIME = 12000;

      const queryForAlertDocs = async <T>(ruleId: string): Promise<Array<SearchHit<T>>> => {
        const searchResult = await es.search({
          index: alertsAsDataIndex,
          sort: [{ '@timestamp': 'desc' }],
          query: {
            bool: {
              must: {
                term: { [ALERT_RULE_UUID]: { value: ruleId } },
              },
            },
          },
          size: 25,
        });
        return searchResult.hits.hits as Array<SearchHit<T>>;
      };

      const runSoon = async (id: String) => {
        return supertest
          .post(`${getUrlPrefix(space.id)}/internal/alerting/rule/${id}/_run_soon`)
          .set('kbn-xsrf', 'foo')
          .expect(204);
      };

      afterEach(async () => {
        await es.deleteByQuery({
          index: alertsAsDataIndex,
          query: {
            match_all: {},
          },
          conflicts: 'proceed',
          ignore_unavailable: true,
        });
        await objectRemover.removeAll();
        await resetRulesSettings(supertest, space.id);
      });

      it('should clear flapping history when enabling rules', async () => {
        const params = { pattern: { alertA: [true, false, true, false, true, false, true] } };
        await supertest
          .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/settings/_flapping`)
          .set('kbn-xsrf', 'foo')
          .auth('superuser', 'superuser')
          .send({
            enabled: true,
            look_back_window: 5,
            status_change_threshold: 2,
          })
          .expect(200);
        await setTimeoutAsync(TEST_CACHE_EXPIRATION_TIME);

        const rule1 = await supertest
          .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              rule_type_id: 'test.patternFiringAad',
              schedule: { interval: '1d' },
              throttle: null,
              params,
              actions: [],
              notify_when: RuleNotifyWhen.CHANGE,
            })
          )
          .expect(200);

        objectRemover.add(space.id, rule1.body.id, 'rule', 'alerting');

        const rule2 = await supertest
          .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              rule_type_id: 'test.patternFiringAad',
              schedule: { interval: '1d' },
              throttle: null,
              params,
              actions: [],
              notify_when: RuleNotifyWhen.CHANGE,
            })
          )
          .expect(200);

        objectRemover.add(space.id, rule2.body.id, 'rule', 'alerting');

        for (let i = 0; i < 4; i++) {
          await retry.try(async () => {
            const alert1Docs = await queryForAlertDocs<Alert>(rule1.body.id);
            const alert2Docs = await queryForAlertDocs<Alert>(rule2.body.id);

            expect(alert1Docs[0]?._source[ALERT_FLAPPING_HISTORY]?.length).eql(i + 1);
            expect(alert2Docs[0]?._source[ALERT_FLAPPING_HISTORY]?.length).eql(i + 1);
            if (i === 3) {
              return;
            }
            await Promise.all([runSoon(rule1.body.id), runSoon(rule2.body.id)]);
          });
        }

        let alert1Docs = await queryForAlertDocs<Alert>(rule1.body.id);
        let alert2Docs = await queryForAlertDocs<Alert>(rule1.body.id);

        expect(alert1Docs[0]?._source[ALERT_FLAPPING_HISTORY]).eql([true, true, true, true]);
        expect(alert1Docs[0]?._source[ALERT_FLAPPING]).eql(true);

        expect(alert2Docs[0]?._source[ALERT_FLAPPING_HISTORY]).eql([true, true, true, true]);
        expect(alert2Docs[0]?._source[ALERT_FLAPPING]).eql(true);

        await supertestWithoutAuth
          .patch(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_disable`)
          .set('kbn-xsrf', 'foo')
          .auth(user.username, user.password)
          .send({ ids: [rule1.body.id, rule2.body.id] })
          .expect(200);

        await supertestWithoutAuth
          .patch(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_enable`)
          .set('kbn-xsrf', 'foo')
          .auth(user.username, user.password)
          .send({ ids: [rule1.body.id, rule2.body.id] })
          .expect(200);

        alert1Docs = await queryForAlertDocs<Alert>(rule1.body.id);
        alert2Docs = await queryForAlertDocs<Alert>(rule1.body.id);

        expect(alert1Docs[0]?._source[ALERT_FLAPPING_HISTORY]).eql([]);
        expect(alert1Docs[0]?._source[ALERT_FLAPPING]).eql(false);
        expect(alert2Docs[0]?._source[ALERT_FLAPPING_HISTORY]).eql([]);
        expect(alert2Docs[0]?._source[ALERT_FLAPPING]).eql(false);
      });
    });

    describe('Validation tests', () => {
      const { user, space } = SuperuserAtSpace1;
      it('should throw an error when bulk enable of rules when both ids and filter supplied in payload', async () => {
        const { body: createdRule } = await supertest
          .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData({ tags: ['foo'] }))
          .expect(200);
        objectRemover.add(space.id, createdRule.id, 'rule', 'alerting');

        const response = await supertestWithoutAuth
          .patch(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_enable`)
          .set('kbn-xsrf', 'foo')
          .send({ filter: 'fake_filter', ids: [createdRule.id] })
          .auth(user.username, user.password);

        expect(response.statusCode).to.eql(400);
        expect(response.body.message).to.eql(
          "Both 'filter' and 'ids' are supplied. Define either 'ids' or 'filter' properties in method's arguments"
        );
      });

      it('should return an error if we pass more than 1000 ids', async () => {
        const ids = [...Array(1001)].map((_, i) => `rule${i}`);

        const response = await supertestWithoutAuth
          .patch(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_enable`)
          .set('kbn-xsrf', 'foo')
          .send({ ids })
          .auth(user.username, user.password);

        expect(response.body).to.eql({
          error: 'Bad Request',
          message: '[request body.ids]: array size is [1001], but cannot be greater than [1000]',
          statusCode: 400,
        });
      });

      it('should return an error if we do not pass any arguments', async () => {
        const { body: createdRule } = await supertest
          .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData())
          .expect(200);
        objectRemover.add(space.id, createdRule.id, 'rule', 'alerting');

        const response = await supertestWithoutAuth
          .patch(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_enable`)
          .set('kbn-xsrf', 'foo')
          .send({})
          .auth(user.username, user.password);

        expect(response.body).to.eql({
          error: 'Bad Request',
          message: "Either 'ids' or 'filter' property in method's arguments should be provided",
          statusCode: 400,
        });
      });

      it('should return an error if we pass empty ids array', async () => {
        const response = await supertestWithoutAuth
          .patch(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_enable`)
          .set('kbn-xsrf', 'foo')
          .send({ ids: [] })
          .auth(user.username, user.password);

        expect(response.body).to.eql({
          error: 'Bad Request',
          message: '[request body.ids]: array size is [0], but cannot be smaller than [1]',
          statusCode: 400,
        });
      });

      it('should return an error if we pass empty string instead of fiter', async () => {
        const response = await supertestWithoutAuth
          .patch(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_enable`)
          .set('kbn-xsrf', 'foo')
          .send({ filter: '' })
          .auth(user.username, user.password);

        expect(response.body).to.eql({
          error: 'Bad Request',
          message: "Either 'ids' or 'filter' property in method's arguments should be provided",
          statusCode: 400,
        });
      });
    });

    describe('Actions', () => {
      const { user, space } = SuperuserAtSpace1;

      it('should return the actions correctly', async () => {
        const { body: createdAction } = await supertest
          .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'MY action',
            connector_type_id: 'test.noop',
            config: {},
            secrets: {},
          })
          .expect(200);

        const { body: createdRule1 } = await supertest
          .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              enabled: false,
              actions: [
                {
                  id: createdAction.id,
                  group: 'default',
                  params: {},
                },
                {
                  id: 'system-connector-test.system-action',
                  params: {},
                },
              ],
            })
          )
          .expect(200);

        objectRemover.add(space.id, createdRule1.id, 'rule', 'alerting');

        const response = await supertestWithoutAuth
          .patch(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_enable`)
          .set('kbn-xsrf', 'foo')
          .send({ ids: [createdRule1.id] })
          .auth(user.username, user.password);

        const action = response.body.rules[0].actions[0];
        const systemAction = response.body.rules[0].actions[1];
        const { uuid, ...restAction } = action;
        const { uuid: systemActionUuid, ...restSystemAction } = systemAction;

        expect([restAction, restSystemAction]).to.eql([
          {
            id: createdAction.id,
            connector_type_id: 'test.noop',
            group: 'default',
            params: {},
          },
          {
            id: 'system-connector-test.system-action',
            connector_type_id: 'test.system-action',
            params: {},
          },
          ,
        ]);
      });
    });
  });
};
