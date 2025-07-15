/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RetryService } from '@kbn/ftr-common-functional-services';
import type { Agent as SuperTestAgent } from 'supertest';
import type { FtrProviderContext } from '../../common/ftr_provider_context';
import { Spaces } from '../scenarios';
import { getEventLog, getUrlPrefix } from '../../common/lib';

export async function buildUp(getService: FtrProviderContext['getService']) {
  const spacesService = getService('spaces');
  for (const space of Object.values(Spaces)) {
    if (space.id === 'default') continue;

    const { id, name, disabledFeatures } = space;
    await spacesService.create({ id, name, disabledFeatures });
  }
}

export async function tearDown(getService: FtrProviderContext['getService']) {
  const kibanaServer = getService('kibanaServer');
  await kibanaServer.savedObjects.cleanStandardList();

  const spacesService = getService('spaces');
  for (const space of Object.values(Spaces)) await spacesService.delete(space.id);
}

export const runSoon = async ({
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
  return retry.try(async () => {
    await supertest
      .post(`${getUrlPrefix(spaceId)}/internal/alerting/rule/${id}/_run_soon`)
      .set('kbn-xsrf', 'foo')
      .expect(204);
  });
};

export const getRuleEvents = async ({
  id,
  action,
  newInstance,
  activeInstance,
  recoveredInstance,
  retry,
  spaceId = Spaces.space1.id,
  getService,
}: {
  id: string;
  action?: number;
  newInstance?: number;
  activeInstance?: number;
  recoveredInstance?: number;
  retry: RetryService;
  spaceId?: string;
  getService: FtrProviderContext['getService'];
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

export const waitForRuleExecute = ({
  id,
  retry,
  spaceId = Spaces.space1.id,
  execute,
  actionExecute,
  getService,
}: {
  id: string;
  retry: RetryService;
  spaceId?: string;
  execute: number;
  actionExecute?: number;
  getService: FtrProviderContext['getService'];
}) => {
  const conditions: Array<[string, { gte: number } | { equal: number }]> = [
    ['execute', { equal: execute }],
  ];
  if (Number.isInteger(actionExecute)) {
    conditions.push(['execute-action', { equal: actionExecute as number }]);
  }
  return retry.try(async () => {
    return await getEventLog({
      getService,
      spaceId,
      type: 'alert',
      id,
      provider: 'alerting',
      actions: new Map(conditions),
    });
  });
};
