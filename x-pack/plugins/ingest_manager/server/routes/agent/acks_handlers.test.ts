/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { postAgentAcksHandlerBuilder } from './acks_handlers';
import {
  KibanaResponseFactory,
  RequestHandlerContext,
  SavedObjectsClientContract,
} from 'kibana/server';
import { httpServerMock, savedObjectsClientMock } from '../../../../../../src/core/server/mocks';
import { PostAgentAcksResponse } from '../../../common/types/rest_spec';
import { AckEventSchema } from '../../types/models';
import { AcksService } from '../../services/agents';

describe('test acks schema', () => {
  it('validate that ack event schema expect action id', async () => {
    expect(() =>
      AckEventSchema.validate({
        type: 'ACTION_RESULT',
        subtype: 'CONFIG',
        timestamp: '2019-01-04T14:32:03.36764-05:00',
        agent_id: 'agent',
        message: 'hello',
        payload: 'payload',
      })
    ).toThrow(Error);

    expect(
      AckEventSchema.validate({
        type: 'ACTION_RESULT',
        subtype: 'CONFIG',
        timestamp: '2019-01-04T14:32:03.36764-05:00',
        agent_id: 'agent',
        action_id: 'actionId',
        message: 'hello',
        payload: 'payload',
      })
    ).toBeTruthy();
  });
});

describe('test acks handlers', () => {
  let mockResponse: jest.Mocked<KibanaResponseFactory>;
  let mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    mockSavedObjectsClient = savedObjectsClientMock.create();
    mockResponse = httpServerMock.createResponseFactory();
  });

  it('should succeed on valid agent event', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({
      headers: {
        authorization: 'ApiKey TmVqTDBIQUJsRkw1em52R1ZIUF86NS1NaTItdHFUTHFHbThmQW1Fb0ljUQ==',
      },
      body: {
        events: [
          {
            type: 'ACTION_RESULT',
            subtype: 'CONFIG',
            timestamp: '2019-01-04T14:32:03.36764-05:00',
            action_id: 'action1',
            agent_id: 'agent',
            message: 'message',
          },
        ],
      },
    });

    const ackService: AcksService = {
      acknowledgeAgentActions: jest.fn().mockReturnValueOnce([
        {
          type: 'CONFIG_CHANGE',
          id: 'action1',
        },
      ]),
      authenticateAgentWithAccessToken: jest.fn().mockReturnValueOnce({
        id: 'agent',
      }),
      getSavedObjectsClientContract: jest.fn().mockReturnValueOnce(mockSavedObjectsClient),
      saveAgentEvents: jest.fn(),
    } as jest.Mocked<AcksService>;

    const postAgentAcksHandler = postAgentAcksHandlerBuilder(ackService);
    await postAgentAcksHandler(({} as unknown) as RequestHandlerContext, mockRequest, mockResponse);
    expect(mockResponse.ok.mock.calls[0][0]?.body as PostAgentAcksResponse).toEqual({
      action: 'acks',
      success: true,
    });
  });
});
