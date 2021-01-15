/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NewAgentActionSchema } from '../../types/models';
import {
  KibanaResponseFactory,
  RequestHandlerContext,
  SavedObjectsClientContract,
} from 'kibana/server';
import { savedObjectsClientMock, httpServerMock } from 'src/core/server/mocks';
import { ActionsService } from '../../services/agents';
import { AgentAction } from '../../../common/types/models';
import { postNewAgentActionHandlerBuilder } from './actions_handlers';
import {
  PostNewAgentActionRequest,
  PostNewAgentActionResponse,
} from '../../../common/types/rest_spec';

describe('test actions handlers schema', () => {
  it('validate that new agent actions schema is valid', async () => {
    expect(
      NewAgentActionSchema.validate({
        type: 'POLICY_CHANGE',
        data: 'data',
      })
    ).toBeTruthy();
  });

  it('validate that new agent actions schema is invalid when required properties are not provided', async () => {
    expect(() => {
      NewAgentActionSchema.validate({
        data: 'data',
      });
    }).toThrowError();
  });
});

describe('test actions handlers', () => {
  let mockResponse: jest.Mocked<KibanaResponseFactory>;
  let mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    mockSavedObjectsClient = savedObjectsClientMock.create();
    mockResponse = httpServerMock.createResponseFactory();
  });

  it('should succeed on valid new agent action', async () => {
    const postNewAgentActionRequest: PostNewAgentActionRequest = {
      body: {
        action: {
          type: 'POLICY_CHANGE',
          data: 'data',
        },
      },
      params: {
        agentId: 'id',
      },
    };

    const mockRequest = httpServerMock.createKibanaRequest(postNewAgentActionRequest);

    const agentAction = ({
      type: 'POLICY_CHANGE',
      id: 'action1',
      sent_at: '2020-03-14T19:45:02.620Z',
      timestamp: '2019-01-04T14:32:03.36764-05:00',
      created_at: '2020-03-14T19:45:02.620Z',
    } as unknown) as AgentAction;

    const actionsService: ActionsService = {
      getAgent: jest.fn().mockReturnValueOnce({
        id: 'agent',
      }),
      createAgentAction: jest.fn().mockReturnValueOnce(agentAction),
    } as jest.Mocked<ActionsService>;

    const postNewAgentActionHandler = postNewAgentActionHandlerBuilder(actionsService);
    await postNewAgentActionHandler(
      ({
        core: {
          savedObjects: {
            client: mockSavedObjectsClient,
          },
        },
      } as unknown) as RequestHandlerContext,
      mockRequest,
      mockResponse
    );

    const expectedAgentActionResponse = (mockResponse.ok.mock.calls[0][0]
      ?.body as unknown) as PostNewAgentActionResponse;

    expect(expectedAgentActionResponse.item).toEqual(agentAction);
  });
});
