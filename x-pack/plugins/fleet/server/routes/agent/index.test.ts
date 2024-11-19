/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';

import type { FleetRequestHandlerContext } from '../..';

import { xpackMocks } from '../../mocks';
import {
  DeleteAgentResponseSchema,
  DeleteAgentUploadFileResponseSchema,
  GetActionStatusResponseSchema,
  GetAgentDataResponseSchema,
  GetAgentResponseSchema,
  GetAgentStatusResponseSchema,
  GetAgentsResponseSchema,
  GetAvailableAgentVersionsResponseSchema,
  ListAgentUploadsResponseSchema,
  PostBulkActionResponseSchema,
  PostNewAgentActionResponseSchema,
  PostRetrieveAgentsByActionsResponseSchema,
} from '../../types/rest_spec/agent';

import type { Agent } from '../../types';
import { GetTagsResponseSchema } from '../../types';
import type {
  DeleteAgentUploadResponse,
  GetActionStatusResponse,
  GetAgentStatusResponse,
  GetAgentUploadsResponse,
  GetAgentsResponse,
  GetAvailableVersionsResponse,
  PostNewAgentActionResponse,
  PostRetrieveAgentsByActionsResponse,
} from '../../../common/types';
import { UnhealthyReason } from '../../../common/types';

import {
  getAgentsHandler,
  getAgentTagsHandler,
  getAgentHandler,
  deleteAgentHandler,
  getAgentStatusForAgentPolicyHandler,
  getAgentDataHandler,
  bulkUpdateAgentTagsHandler,
  getAvailableVersionsHandler,
  getActionStatusHandler,
  getAgentUploadsHandler,
  deleteAgentUploadFileHandler,
  postRetrieveAgentsByActionsHandler,
} from './handlers';

import { postNewAgentActionHandlerBuilder } from './actions_handlers';

jest.mock('./handlers', () => ({
  ...jest.requireActual('./handlers'),
  getAgentHandler: jest.fn(),
  deleteAgentHandler: jest.fn(),
  getAgentsHandler: jest.fn(),
  getAgentTagsHandler: jest.fn(),
  getAgentStatusForAgentPolicyHandler: jest.fn(),
  postBulkAgentReassignHandler: jest.fn(),
  getAgentDataHandler: jest.fn(),
  bulkUpdateAgentTagsHandler: jest.fn(),
  getAvailableVersionsHandler: jest.fn(),
  getActionStatusHandler: jest.fn(),
  getAgentUploadsHandler: jest.fn(),
  getAgentUploadFileHandler: jest.fn(),
  deleteAgentUploadFileHandler: jest.fn(),
  postAgentReassignHandler: jest.fn(),
  postRetrieveAgentsByActionsHandler: jest.fn(),
}));

jest.mock('./actions_handlers', () => ({
  postNewAgentActionHandlerBuilder: jest.fn(),
}));

describe('schema validation', () => {
  let context: FleetRequestHandlerContext;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let agent: Agent;

  beforeEach(() => {
    context = xpackMocks.createRequestHandlerContext() as unknown as FleetRequestHandlerContext;
    response = httpServerMock.createResponseFactory();
    agent = {
      id: 'id',
      access_api_key: 'key',
      default_api_key_history: [],
      outputs: {
        output1: {
          api_key_id: 'id',
          type: 'elasticsearch',
          to_retire_api_key_ids: [
            {
              id: 'id',
              retired_at: 'date',
            },
          ],
        },
      },
      status: 'online',
      packages: ['package'],
      sort: ['sort'],
      metrics: {
        cpu_avg: 1,
        memory_size_byte_avg: 2,
      },
      type: 'PERMANENT',
      active: true,
      enrolled_at: 'date',
      unenrolled_at: 'date',
      unenrollment_started_at: 'date',
      upgraded_at: 'date',
      upgrade_started_at: 'date',
      upgrade_details: {
        target_version: 'version',
        action_id: 'id',
        state: 'UPG_DOWNLOADING',
        metadata: {
          scheduled_at: 'date',
          download_percent: 1,
          download_rate: 1,
          failed_state: 'UPG_DOWNLOADING',
          error_msg: 'error',
          retry_error_msg: 'error',
          retry_until: 'date',
        },
      },
      access_api_key_id: 'id',
      default_api_key: 'key',
      default_api_key_id: 'id',
      policy_id: 'id',
      policy_revision: 1,
      last_checkin: 'date',
      last_checkin_status: 'error',
      last_checkin_message: 'message',
      user_provided_metadata: { key: 'value' },
      local_metadata: { key: 'value' },
      tags: ['tag'],
      components: [
        {
          id: 'id',
          type: 'type',
          status: 'FAILED',
          message: 'message',
          units: [
            {
              id: 'id',
              type: 'input',
              status: 'FAILED',
              message: 'message',
              payload: {
                key: 'value',
              },
            },
          ],
        },
      ],
      agent: {
        id: 'id',
        version: 'version',
        key: 'value',
      },
      unhealthy_reason: [UnhealthyReason.INPUT],
      namespaces: ['namespace'],
    };
  });

  it('get agent should return valid response', async () => {
    const expectedResponse = {
      item: agent,
    };
    (getAgentHandler as jest.Mock).mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await getAgentHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = GetAgentResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('delete agent should return valid response', async () => {
    const expectedResponse = {
      action: 'deleted',
    };
    (deleteAgentHandler as jest.Mock).mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await deleteAgentHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = DeleteAgentResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('bulk update agent tags should return valid response', async () => {
    const expectedResponse = {
      actionId: 'id',
    };
    (bulkUpdateAgentTagsHandler as jest.Mock).mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await bulkUpdateAgentTagsHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = PostBulkActionResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('list agents should return valid response', async () => {
    const expectedResponse: GetAgentsResponse = {
      items: [agent],
      total: 1,
      page: 1,
      perPage: 1,
      statusSummary: {
        online: 1,
        error: 1,
        offline: 1,
        inactive: 1,
        updating: 1,
        unenrolled: 1,
        degraded: 1,
        unenrolling: 1,
        enrolling: 1,
      },
    };
    (getAgentsHandler as jest.Mock).mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await getAgentsHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = GetAgentsResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('list agent tags should return valid response', async () => {
    const expectedResponse = {
      items: ['tag'],
    };
    (getAgentTagsHandler as jest.Mock).mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await getAgentTagsHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = GetTagsResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('create agent actions should return valid response', async () => {
    const expectedResponse: PostNewAgentActionResponse = {
      item: {
        type: 'UNENROLL',
        data: {},
        sent_at: 'date',
        created_at: 'date',
        id: 'id',
        ack_data: {},
        agents: ['id'],
        namespaces: ['namespace'],
        expiration: 'date',
        start_time: 'date',
        minimum_execution_duration: 1,
        rollout_duration_seconds: 1,
        source_uri: 'uri',
        total: 1,
      },
    };
    (postNewAgentActionHandlerBuilder as jest.Mock).mockImplementation(
      () => (ctx: any, req: any, res: any) => {
        return res.ok({ body: expectedResponse });
      }
    );
    await postNewAgentActionHandlerBuilder({} as any)(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = PostNewAgentActionResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('list agents by action ids should return valid response', async () => {
    const expectedResponse: PostRetrieveAgentsByActionsResponse = {
      items: ['id'],
    };
    (postRetrieveAgentsByActionsHandler as jest.Mock).mockImplementation(
      (ctx: any, req: any, res: any) => {
        return res.ok({ body: expectedResponse });
      }
    );
    await postRetrieveAgentsByActionsHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = PostRetrieveAgentsByActionsResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('get agent uploads should return valid response', async () => {
    const expectedResponse: GetAgentUploadsResponse = {
      items: [
        {
          id: 'id',
          name: 'name',
          createTime: 'date',
          filePath: 'path',
          status: 'READY',
          actionId: '1',
          error: 'error',
        },
      ],
    };
    (getAgentUploadsHandler as jest.Mock).mockImplementation((ctx: any, req: any, res: any) => {
      return res.ok({ body: expectedResponse });
    });
    await getAgentUploadsHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = ListAgentUploadsResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('delete uploaded file should return valid response', async () => {
    const expectedResponse: DeleteAgentUploadResponse = {
      id: 'id',
      deleted: true,
    };
    (deleteAgentUploadFileHandler as jest.Mock).mockImplementation(
      (ctx: any, req: any, res: any) => {
        return res.ok({ body: expectedResponse });
      }
    );
    await deleteAgentUploadFileHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = DeleteAgentUploadFileResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('get agent status should return valid response', async () => {
    const expectedResponse: GetAgentStatusResponse = {
      results: {
        events: 1,
        online: 1,
        error: 1,
        offline: 1,
        other: 1,
        updating: 1,
        inactive: 1,
        unenrolled: 1,
        all: 1,
        active: 1,
      },
    };
    (getAgentStatusForAgentPolicyHandler as jest.Mock).mockImplementation(
      (ctx: any, req: any, res: any) => {
        return res.ok({ body: expectedResponse });
      }
    );
    await getAgentStatusForAgentPolicyHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = GetAgentStatusResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('get agent data should return valid response', async () => {
    const expectedResponse = {
      items: [
        {
          id: {
            data: true,
          },
        },
      ],
      dataPreview: [{}],
    };
    (getAgentDataHandler as jest.Mock).mockImplementation((ctx: any, req: any, res: any) => {
      return res.ok({ body: expectedResponse });
    });
    await getAgentDataHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = GetAgentDataResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('current actions should return valid response', async () => {
    const expectedResponse: GetActionStatusResponse = {
      items: [
        {
          actionId: 'id',
          nbAgentsActionCreated: 1,
          nbAgentsAck: 1,
          nbAgentsFailed: 1,
          version: '1',
          startTime: 'date',
          type: 'UNENROLL',
          nbAgentsActioned: 1,
          status: 'COMPLETE',
          expiration: 'date',
          completionTime: 'date',
          cancellationTime: 'date',
          newPolicyId: 'id',
          creationTime: 'date',
          hasRolloutPeriod: true,
          latestErrors: [
            {
              agentId: 'id',
              error: 'error',
              timestamp: 'date',
              hostname: 'host',
            },
          ],
          revision: 1,
          policyId: 'id',
        },
      ],
    };
    (getActionStatusHandler as jest.Mock).mockImplementation((ctx: any, req: any, res: any) => {
      return res.ok({ body: expectedResponse });
    });
    await getActionStatusHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = GetActionStatusResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('get available version should return valid response', async () => {
    const expectedResponse: GetAvailableVersionsResponse = {
      items: ['8.15.0'],
    };
    (getAvailableVersionsHandler as jest.Mock).mockImplementation(
      (ctx: any, req: any, res: any) => {
        return res.ok({ body: expectedResponse });
      }
    );
    await getAvailableVersionsHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = GetAvailableAgentVersionsResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });
});
