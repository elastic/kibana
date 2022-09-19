/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { HostedAgentPolicyRestrictionRelatedError } from '../../errors';
import { invalidateAPIKeys } from '../api_keys';

import { appContextService } from '../app_context';

import { createAppContextStartContractMock } from '../../mocks';

import { unenrollAgent, unenrollAgents } from './unenroll';
import { invalidateAPIKeysForAgents } from './unenroll_action_runner';
import { createClientMock } from './action.mock';

jest.mock('../api_keys');

const mockedInvalidateAPIKeys = invalidateAPIKeys as jest.MockedFunction<typeof invalidateAPIKeys>;

describe('unenrollAgent (singular)', () => {
  it('can unenroll from regular agent policy', async () => {
    const { soClient, esClient, agentInRegularDoc } = createClientMock();
    await unenrollAgent(soClient, esClient, agentInRegularDoc._id);

    // calls ES update with correct values
    expect(esClient.update).toBeCalledTimes(1);
    const calledWith = esClient.update.mock.calls[0];
    expect(calledWith[0]?.id).toBe(agentInRegularDoc._id);
    expect((calledWith[0] as estypes.UpdateRequest)?.body).toHaveProperty(
      'doc.unenrollment_started_at'
    );
  });

  it('cannot unenroll from hosted agent policy by default', async () => {
    const { soClient, esClient, agentInHostedDoc } = createClientMock();
    await expect(unenrollAgent(soClient, esClient, agentInHostedDoc._id)).rejects.toThrowError(
      HostedAgentPolicyRestrictionRelatedError
    );
    // does not call ES update
    expect(esClient.update).toBeCalledTimes(0);
  });

  it('cannot unenroll from hosted agent policy with revoke=true', async () => {
    const { soClient, esClient, agentInHostedDoc } = createClientMock();
    await expect(
      unenrollAgent(soClient, esClient, agentInHostedDoc._id, { revoke: true })
    ).rejects.toThrowError(HostedAgentPolicyRestrictionRelatedError);
    // does not call ES update
    expect(esClient.update).toBeCalledTimes(0);
  });

  it('can unenroll from hosted agent policy with force=true', async () => {
    const { soClient, esClient, agentInHostedDoc } = createClientMock();
    await unenrollAgent(soClient, esClient, agentInHostedDoc._id, { force: true });
    // calls ES update with correct values
    expect(esClient.update).toBeCalledTimes(1);
    const calledWith = esClient.update.mock.calls[0];
    expect(calledWith[0]?.id).toBe(agentInHostedDoc._id);
    expect((calledWith[0] as estypes.UpdateRequest)?.body).toHaveProperty(
      'doc.unenrollment_started_at'
    );
  });

  it('can unenroll from hosted agent policy with force=true and revoke=true', async () => {
    const { soClient, esClient, agentInHostedDoc } = createClientMock();
    await unenrollAgent(soClient, esClient, agentInHostedDoc._id, { force: true, revoke: true });
    // calls ES update with correct values
    expect(esClient.update).toBeCalledTimes(1);
    const calledWith = esClient.update.mock.calls[0];
    expect(calledWith[0]?.id).toBe(agentInHostedDoc._id);
    expect((calledWith[0] as estypes.UpdateRequest)?.body).toHaveProperty('doc.unenrolled_at');
  });
});

describe('unenrollAgents (plural)', () => {
  beforeEach(async () => {
    appContextService.start(createAppContextStartContractMock());
  });

  afterEach(() => {
    appContextService.stop();
  });
  it('can unenroll from an regular agent policy', async () => {
    const { soClient, esClient, agentInRegularDoc, agentInRegularDoc2 } = createClientMock();
    const idsToUnenroll = [agentInRegularDoc._id, agentInRegularDoc2._id];
    await unenrollAgents(soClient, esClient, { agentIds: idsToUnenroll });

    // calls ES update with correct values
    const calledWith = esClient.bulk.mock.calls[0][0];
    const ids = (calledWith as estypes.BulkRequest)?.body
      ?.filter((i: any) => i.update !== undefined)
      .map((i: any) => i.update._id);
    const docs = (calledWith as estypes.BulkRequest)?.body
      ?.filter((i: any) => i.doc)
      .map((i: any) => i.doc);
    expect(ids).toEqual(idsToUnenroll);
    for (const doc of docs!) {
      expect(doc).toHaveProperty('unenrollment_started_at');
    }
  });
  it('cannot unenroll from a hosted agent policy by default', async () => {
    const { soClient, esClient, agentInHostedDoc, agentInRegularDoc, agentInRegularDoc2 } =
      createClientMock();

    const idsToUnenroll = [agentInRegularDoc._id, agentInHostedDoc._id, agentInRegularDoc2._id];
    await unenrollAgents(soClient, esClient, { agentIds: idsToUnenroll });

    // calls ES update with correct values
    const onlyRegular = [agentInRegularDoc._id, agentInRegularDoc2._id];
    const calledWith = esClient.bulk.mock.calls[1][0];
    const ids = (calledWith as estypes.BulkRequest)?.body
      ?.filter((i: any) => i.update !== undefined)
      .map((i: any) => i.update._id);
    const docs = (calledWith as estypes.BulkRequest)?.body
      ?.filter((i: any) => i.doc)
      .map((i: any) => i.doc);
    expect(ids).toEqual(onlyRegular);
    for (const doc of docs!) {
      expect(doc).toHaveProperty('unenrollment_started_at');
    }

    // hosted policy is updated in action results with error
    const calledWithActionResults = esClient.bulk.mock.calls[0][0] as estypes.BulkRequest;
    // bulk write two line per create
    expect(calledWithActionResults.body?.length).toBe(2);
    const expectedObject = expect.objectContaining({
      '@timestamp': expect.anything(),
      action_id: expect.anything(),
      agent_id: 'agent-in-hosted-policy',
      error:
        'Cannot unenroll agent-in-hosted-policy from a hosted agent policy hosted-agent-policy in Fleet because the agent policy is managed by an external orchestration solution, such as Elastic Cloud, Kubernetes, etc. Please make changes using your orchestration solution.',
    });
    expect(calledWithActionResults.body?.[1] as any).toEqual(expectedObject);
  });

  it('cannot unenroll from a hosted agent policy with revoke=true', async () => {
    const { soClient, esClient, agentInHostedDoc, agentInRegularDoc, agentInRegularDoc2 } =
      createClientMock();

    const idsToUnenroll = [agentInRegularDoc._id, agentInHostedDoc._id, agentInRegularDoc2._id];

    const unenrolledResponse = await unenrollAgents(soClient, esClient, {
      agentIds: idsToUnenroll,
      revoke: true,
    });

    expect(unenrolledResponse.items).toMatchObject([
      {
        id: 'agent-in-regular-policy',
        success: true,
      },
      {
        id: 'agent-in-hosted-policy',
        success: false,
      },
      {
        id: 'agent-in-regular-policy2',
        success: true,
      },
    ]);

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
      expect(doc).toHaveProperty('unenrolled_at');
    }
  });

  it('can unenroll from hosted agent policy with force=true', async () => {
    const { soClient, esClient, agentInHostedDoc, agentInRegularDoc, agentInRegularDoc2 } =
      createClientMock();
    const idsToUnenroll = [agentInRegularDoc._id, agentInHostedDoc._id, agentInRegularDoc2._id];
    await unenrollAgents(soClient, esClient, { agentIds: idsToUnenroll, force: true });

    // calls ES update with correct values
    const calledWith = esClient.bulk.mock.calls[0][0];
    const ids = (calledWith as estypes.BulkRequest)?.body
      ?.filter((i: any) => i.update !== undefined)
      .map((i: any) => i.update._id);
    const docs = (calledWith as estypes.BulkRequest)?.body
      ?.filter((i: any) => i.doc)
      .map((i: any) => i.doc);
    expect(ids).toEqual(idsToUnenroll);
    for (const doc of docs!) {
      expect(doc).toHaveProperty('unenrollment_started_at');
    }
  });

  it('can unenroll from hosted agent policy with force=true and revoke=true', async () => {
    const { soClient, esClient, agentInHostedDoc, agentInRegularDoc, agentInRegularDoc2 } =
      createClientMock();

    const idsToUnenroll = [agentInRegularDoc._id, agentInHostedDoc._id, agentInRegularDoc2._id];

    const unenrolledResponse = await unenrollAgents(soClient, esClient, {
      agentIds: idsToUnenroll,
      revoke: true,
      force: true,
    });

    expect(unenrolledResponse.items).toMatchObject([
      {
        id: 'agent-in-regular-policy',
        success: true,
      },
      {
        id: 'agent-in-hosted-policy',
        success: true,
      },
      {
        id: 'agent-in-regular-policy2',
        success: true,
      },
    ]);

    // calls ES update with correct values
    const calledWith = esClient.bulk.mock.calls[0][0];
    const ids = (calledWith as estypes.BulkRequest)?.body
      ?.filter((i: any) => i.update !== undefined)
      .map((i: any) => i.update._id);
    const docs = (calledWith as estypes.BulkRequest)?.body
      ?.filter((i: any) => i.doc)
      .map((i: any) => i.doc);
    expect(ids).toEqual(idsToUnenroll);
    for (const doc of docs!) {
      expect(doc).toHaveProperty('unenrolled_at');
    }
  });
});

describe('invalidateAPIKeysForAgents', () => {
  beforeEach(() => {
    mockedInvalidateAPIKeys.mockReset();
  });
  it('revoke all the agents API keys', async () => {
    await invalidateAPIKeysForAgents([
      {
        id: 'agent1',
        default_api_key_id: 'defaultApiKey1',
        access_api_key_id: 'accessApiKey1',
        default_api_key_history: [
          {
            id: 'defaultApiKeyHistory1',
          },
          {
            id: 'defaultApiKeyHistory2',
          },
        ],
      } as any,
    ]);

    expect(mockedInvalidateAPIKeys).toBeCalledTimes(1);
    expect(mockedInvalidateAPIKeys).toBeCalledWith([
      'accessApiKey1',
      'defaultApiKey1',
      'defaultApiKeyHistory1',
      'defaultApiKeyHistory2',
    ]);
  });
});
