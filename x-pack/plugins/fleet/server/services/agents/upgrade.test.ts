/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { appContextService } from '../app_context';

import { createAppContextStartContractMock } from '../../mocks';

import { sendUpgradeAgentsActions } from './upgrade';
import { createClientMock } from './action.mock';
import { getRollingUpgradeOptions } from './upgrade_action_runner';

describe('sendUpgradeAgentsActions (plural)', () => {
  beforeEach(async () => {
    appContextService.start(createAppContextStartContractMock());
  });

  afterEach(() => {
    appContextService.stop();
  });
  it('can upgrade from an regular agent policy', async () => {
    const { soClient, esClient, agentInRegularDoc, agentInRegularDoc2 } = createClientMock();
    const idsToAction = [agentInRegularDoc._id, agentInRegularDoc2._id];
    await sendUpgradeAgentsActions(soClient, esClient, { agentIds: idsToAction, version: '8.5.0' });

    // calls ES update with correct values
    const calledWith = esClient.bulk.mock.calls[0][0];
    const ids = (calledWith as estypes.BulkRequest)?.body
      ?.filter((i: any) => i.update !== undefined)
      .map((i: any) => i.update._id);
    const docs = (calledWith as estypes.BulkRequest)?.body
      ?.filter((i: any) => i.doc)
      .map((i: any) => i.doc);
    expect(ids).toEqual(idsToAction);
    for (const doc of docs!) {
      expect(doc).toHaveProperty('upgrade_started_at');
      expect(doc.upgraded_at).toEqual(null);
    }
  });
  it('cannot upgrade from a hosted agent policy by default', async () => {
    const { soClient, esClient, agentInHostedDoc, agentInRegularDoc, agentInRegularDoc2 } =
      createClientMock();

    const idsToAction = [agentInRegularDoc._id, agentInHostedDoc._id, agentInRegularDoc2._id];
    await sendUpgradeAgentsActions(soClient, esClient, { agentIds: idsToAction, version: '8.5.0' });

    // calls ES update with correct values
    const onlyRegular = [agentInRegularDoc._id, agentInRegularDoc2._id];
    const calledWith = esClient.bulk.mock.calls[0][0];
    const ids = (calledWith as estypes.BulkRequest)?.body
      ?.filter((i: any) => i.update !== undefined)
      .map((i: any) => i.update._id);
    const docs = (calledWith as estypes.BulkRequest)?.body
      ?.filter((i: any) => i.doc)
      .map((i: any) => i.doc);
    expect(ids).toEqual(onlyRegular);
    for (const doc of docs!) {
      expect(doc).toHaveProperty('upgrade_started_at');
      expect(doc.upgraded_at).toEqual(null);
    }

    // hosted policy is updated in action results with error
    const calledWithActionResults = esClient.bulk.mock.calls[1][0] as estypes.BulkRequest;
    // bulk write two line per create
    expect(calledWithActionResults.body?.length).toBe(2);
    const expectedObject = expect.objectContaining({
      '@timestamp': expect.anything(),
      action_id: expect.anything(),
      agent_id: 'agent-in-hosted-policy',
      error:
        'Cannot upgrade agent in hosted agent policy hosted-agent-policy in Fleet because the agent policy is managed by an external orchestration solution, such as Elastic Cloud, Kubernetes, etc. Please make changes using your orchestration solution.',
    });
    expect(calledWithActionResults.body?.[1] as any).toEqual(expectedObject);
  });

  it('can upgrade from hosted agent policy with force=true', async () => {
    const { soClient, esClient, agentInHostedDoc, agentInRegularDoc, agentInRegularDoc2 } =
      createClientMock();
    const idsToAction = [agentInRegularDoc._id, agentInHostedDoc._id, agentInRegularDoc2._id];
    await sendUpgradeAgentsActions(soClient, esClient, {
      agentIds: idsToAction,
      force: true,
      version: '8.5.0',
    });

    // calls ES update with correct values
    const calledWith = esClient.bulk.mock.calls[0][0];
    const ids = (calledWith as estypes.BulkRequest)?.body
      ?.filter((i: any) => i.update !== undefined)
      .map((i: any) => i.update._id);
    const docs = (calledWith as estypes.BulkRequest)?.body
      ?.filter((i: any) => i.doc)
      .map((i: any) => i.doc);
    expect(ids).toEqual(idsToAction);
    for (const doc of docs!) {
      expect(doc).toHaveProperty('upgrade_started_at');
      expect(doc.upgraded_at).toEqual(null);
    }
  });
});

describe('getRollingUpgradeOptions', () => {
  it('should set longer expiration for 1h duration', () => {
    const options = getRollingUpgradeOptions('2023-01-06T00:00:00Z', 3600);
    expect(options).toEqual({
      expiration: '2023-01-06T02:00:00.000Z',
      minimum_execution_duration: 3600,
      start_time: '2023-01-06T00:00:00Z',
    });
  });
  it('should set longer expiration for 2h duration', () => {
    const options = getRollingUpgradeOptions('2023-01-06T00:00:00Z', 7200);
    expect(options).toEqual({
      expiration: '2023-01-06T04:00:00.000Z',
      minimum_execution_duration: 7200,
      start_time: '2023-01-06T00:00:00Z',
    });
  });

  it('should set normal expiration for longer duration', () => {
    const options = getRollingUpgradeOptions('2023-01-06T00:00:00Z', 36000);
    expect(options).toEqual({
      expiration: '2023-01-06T10:00:00.000Z',
      minimum_execution_duration: 7200,
      start_time: '2023-01-06T00:00:00Z',
    });
  });

  it('should set min expiration for no duration', () => {
    const options = getRollingUpgradeOptions('2023-01-06T00:00:00Z');
    expect(options).toEqual({
      expiration: '2023-01-06T02:00:00.000Z',
      minimum_execution_duration: 7200,
      start_time: '2023-01-06T00:00:00Z',
    });
  });

  it('should return empty options for no start time, no duration', () => {
    const options = getRollingUpgradeOptions();
    expect(options).toEqual({});
  });
});
