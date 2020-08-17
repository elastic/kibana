/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { findAllUnenrolledAgentIds } from './unenroll';
import { savedObjectsClientMock } from '../../../../../../../../src/core/server/mocks';
import { AgentService } from '../../../../../../ingest_manager/server/services';
import { createMockAgentService } from '../../../mocks';
import { Agent } from '../../../../../../ingest_manager/common/types/models';

describe('test find all unenrolled Agent id', () => {
  let mockSavedObjectClient: jest.Mocked<SavedObjectsClientContract>;
  let mockAgentService: jest.Mocked<AgentService>;
  beforeEach(() => {
    mockSavedObjectClient = savedObjectsClientMock.create();
    mockAgentService = createMockAgentService();
  });

  it('can find all unerolled endpoint agent ids', async () => {
    mockAgentService.listAgents
      .mockImplementationOnce(() =>
        Promise.resolve({
          agents: [
            ({
              id: 'id1',
            } as unknown) as Agent,
          ],
          total: 2,
          page: 1,
          perPage: 1,
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          agents: [
            ({
              id: 'id2',
            } as unknown) as Agent,
          ],
          total: 2,
          page: 1,
          perPage: 1,
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          agents: [],
          total: 2,
          page: 1,
          perPage: 1,
        })
      );
    const agentIds = await findAllUnenrolledAgentIds(mockAgentService, mockSavedObjectClient);
    expect(agentIds).toBeTruthy();
    expect(agentIds).toEqual(['id1', 'id2']);
  });
});
