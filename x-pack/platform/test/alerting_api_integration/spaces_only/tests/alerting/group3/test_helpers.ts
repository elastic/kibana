/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { setTimeout as setTimeoutAsync } from 'timers/promises';
import type { RetryService } from '@kbn/ftr-common-functional-services';
import type { IValidatedEvent } from '@kbn/event-log-plugin/server';
import type { Agent as SuperTestAgent } from 'supertest';
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import type { ObjectRemover } from '../../../../common/lib';
import { getUrlPrefix, getTestRuleData, getEventLog } from '../../../../common/lib';
import { Spaces } from '../../../scenarios';
import { TEST_CACHE_EXPIRATION_TIME } from '../create_test_data';

export const createRule = async ({
  actionId,
  pattern,
  supertest,
  objectRemover,
  overwrites,
}: {
  actionId?: string;
  pattern?: { instance: boolean[] };
  supertest: SuperTestAgent;
  objectRemover: ObjectRemover;
  overwrites?: any;
}) => {
  const { body: createdRule } = await supertest
    .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
    .set('kbn-xsrf', 'foo')
    .send(
      getTestRuleData({
        name: 'test-rule',
        rule_type_id: 'test.patternFiring',
        schedule: { interval: '24h' },
        throttle: null,
        notify_when: 'onActiveAlert',
        params: {
          pattern,
        },
        actions: actionId
          ? [
              {
                id: actionId,
                group: 'default',
                params: {},
              },
              {
                id: actionId,
                group: 'recovered',
                params: {},
              },
            ]
          : [],
        ...overwrites,
      })
    )
    .expect(200);

  objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');
  return createdRule;
};

export const createAction = async ({
  supertest,
  objectRemover,
  spaceId = Spaces.space1.id,
}: {
  supertest: SuperTestAgent;
  objectRemover: ObjectRemover;
  spaceId?: string;
}) => {
  const spacePrefix = spaceId !== 'default' ? `${getUrlPrefix(spaceId)}` : '';
  const { body: createdAction } = await supertest
    .post(`${spacePrefix}/api/actions/connector`)
    .set('kbn-xsrf', 'foo')
    .send({
      name: 'MY action',
      connector_type_id: 'test.noop',
      config: {},
      secrets: {},
    })
    .expect(200);

  objectRemover.add(spaceId, createdAction.id, 'connector', 'actions');
  return createdAction;
};

export const createMaintenanceWindow = async ({
  overwrites,
  supertest,
  objectRemover,
  spaceId = Spaces.space1.id,
}: {
  overwrites?: any;
  supertest: SuperTestAgent;
  objectRemover: ObjectRemover;
  spaceId?: string;
}) => {
  const spacePrefix = spaceId !== 'default' ? `${getUrlPrefix(spaceId)}` : '';
  const { body: window } = await supertest
    .post(`${spacePrefix}/internal/alerting/rules/maintenance_window`)
    .set('kbn-xsrf', 'foo')
    .send({
      title: 'test-maintenance-window-1',
      duration: 60 * 60 * 1000, // 1 hr
      r_rule: {
        dtstart: moment.utc().toISOString(),
        tzid: 'UTC',
        freq: 0, // yearly
        count: 1,
      },
      ...overwrites,
    })
    .expect(200);

  objectRemover.add(spaceId, window.id, 'rules/maintenance_window', 'alerting', true);

  // wait so cache expires
  await setTimeoutAsync(TEST_CACHE_EXPIRATION_TIME);
  return window;
};

export const getActiveMaintenanceWindows = async ({ supertest }: { supertest: SuperTestAgent }) => {
  const { body: activeMaintenanceWindows } = await supertest
    .get(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/maintenance_window/_active`)
    .set('kbn-xsrf', 'foo')
    .expect(200);

  return activeMaintenanceWindows;
};

export const finishMaintenanceWindow = async ({
  id,
  supertest,
}: {
  id: string;
  supertest: SuperTestAgent;
}) => {
  await supertest
    .post(
      `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/maintenance_window/${id}/_finish`
    )
    .set('kbn-xsrf', 'foo')
    .expect(200);

  // wait so cache expires
  await setTimeoutAsync(TEST_CACHE_EXPIRATION_TIME);
};

export const getRuleEvents = async ({
  id,
  action,
  newInstance,
  activeInstance,
  recoveredInstance,
  retry,
  getService,
  spaceId = Spaces.space1.id,
}: {
  id: string;
  action?: number;
  newInstance?: number;
  activeInstance?: number;
  recoveredInstance?: number;
  retry: RetryService;
  getService: FtrProviderContext['getService'];
  spaceId?: string;
}) => {
  const actions: Array<[string, { equal: number }]> = [];
  if (action) {
    actions.push(['execute-action', { equal: action }]);
  }
  if (newInstance) {
    actions.push(['new-instance', { equal: newInstance }]);
  }
  if (activeInstance) {
    actions.push(['active-instance', { equal: activeInstance }]);
  }
  if (recoveredInstance) {
    actions.push(['recovered-instance', { equal: recoveredInstance }]);
  }
  return retry.try(async () => {
    return await getEventLog({
      getService,
      spaceId,
      type: 'alert',
      id,
      provider: 'alerting',
      actions: new Map(actions),
    });
  });
};

export const expectNoActionsFired = async ({
  id,
  supertest,
  retry,
  spaceId = Spaces.space1.id,
}: {
  id: string;
  supertest: SuperTestAgent;
  retry: RetryService;
  spaceId?: string;
}) => {
  const spacePrefix = spaceId !== 'default' ? `${getUrlPrefix(spaceId)}` : '';
  const events = await retry.try(async () => {
    const { body: result } = await supertest
      .get(`${spacePrefix}/_test/event_log/alert/${id}/_find?per_page=5000`)
      .expect(200);

    if (!result.total) {
      throw new Error('no events found yet');
    }
    return result.data as IValidatedEvent[];
  });

  const actionEvents = events.filter((event) => {
    return event?.event?.action === 'execute-action';
  });

  expect(actionEvents.length).eql(0);
};

export const expectActionsFired = async ({
  id,
  supertest,
  retry,
  expectedNumberOfActions,
  spaceId = Spaces.space1.id,
}: {
  id: string;
  supertest: SuperTestAgent;
  retry: RetryService;
  expectedNumberOfActions: number;
  spaceId?: string;
}) => {
  const spacePrefix = spaceId !== 'default' ? `${getUrlPrefix(spaceId)}` : '';
  await retry.try(async () => {
    const { body: result } = await supertest
      .get(`${spacePrefix}/_test/event_log/alert/${id}/_find?per_page=5000`)
      .expect(200);

    if (!result.total) {
      throw new Error('no events found yet');
    }

    const actionEvents = result.data.filter((event: IValidatedEvent) => {
      return event?.event?.action === 'execute-action';
    });

    expect(actionEvents.length).eql(expectedNumberOfActions);
  });
};
