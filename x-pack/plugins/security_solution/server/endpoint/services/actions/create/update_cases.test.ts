/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Imports
import { updateCases } from './update_cases';
import type { CasesClient } from '@kbn/cases-plugin/server';

// Mocks
jest.mock('@kbn/cases-plugin/server');
const mockCasesClient = {
  cases: {
    getCasesByAlertID: jest.fn(),
  },
  attachments: {
    bulkCreate: jest.fn(),
  },
} as unknown as CasesClient;

describe('updateCases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return early if casesClient is undefined', async () => {
    await updateCases({
      casesClient: undefined,
      createActionPayload: {
        action_id: '123',
        command: 'isolate',
        comment: 'Isolating host',
      },
      endpointData: [
        {
          agent: {
            id: 'abc123',
            type: 'endpoint',
          },
          host: {
            hostname: 'host1',
          },
        },
      ],
    });

    expect(mockCasesClient.cases.getCasesByAlertID).not.toHaveBeenCalled();
    expect(mockCasesClient.attachments.bulkCreate).not.toHaveBeenCalled();
  });

  it('should get cases by alert IDs and update them', async () => {
    mockCasesClient.cases.getCasesByAlertID.mockResolvedValueOnce([{ id: 'case1' }]);

    await updateCases({
      casesClient: mockCasesClient,
      createActionPayload: {
        action_id: '123',
        alert_ids: ['alert1'],
        command: 'isolate',
        comment: 'Isolating host',
      },
      endpointData: [
        {
          agent: {
            id: 'abc123',
            type: 'endpoint',
          },
          host: {
            hostname: 'host1',
          },
        },
      ],
    });

    expect(mockCasesClient.cases.getCasesByAlertID).toHaveBeenCalledWith({
      alertID: 'alert1',
      options: { owner: 'securitySolution' },
    });

    expect(mockCasesClient.attachments.bulkCreate).toHaveBeenCalledWith({
      caseId: 'case1',
      attachments: expect.any(Array),
    });
  });

  it('should handle no alert IDs', async () => {
    await updateCases({
      casesClient: mockCasesClient,
      createActionPayload: {
        action_id: '123',
        command: 'isolate',
        comment: 'Isolating host',
      },
      endpointData: [
        {
          agent: {
            id: 'abc123',
            type: 'endpoint',
          },
          host: {
            hostname: 'host1',
          },
        },
      ],
    });

    expect(mockCasesClient.cases.getCasesByAlertID).not.toHaveBeenCalled();
    expect(mockCasesClient.attachments.bulkCreate).not.toHaveBeenCalled();
  });
  describe('attachments', () => {
    it('creates expected attachments for each case', async () => {
      const caseIds = ['case1', 'case2'];
      const endpointData = [
        {
          agent: {
            id: 'agent1',
            type: 'endpoint',
          },
          host: {
            hostname: 'host1',
          },
        },
        {
          agent: {
            id: 'agent2',
            type: 'endpoint',
          },
          host: {
            hostname: 'host2',
          },
        },
      ];
      await updateCases({
        casesClient: mockCasesClient,
        createActionPayload: {
          action_id: '123',
          case_ids: caseIds,
        },
        endpointData,
      });

      expect(mockCasesClient.attachments.bulkCreate).toHaveBeenCalledTimes(2);

      expect(mockCasesClient.attachments.bulkCreate).toHaveBeenNthCalledWith(2, {
        caseId: 'case2',
        attachments: [
          {
            externalReferenceAttachmentTypeId: 'endpoint',
            externalReferenceId: '123',
            externalReferenceMetadata: {
              command: undefined,
              comment: 'No comment provided',
              targets: [
                { endpointId: 'agent1', hostname: 'host1', type: 'endpoint' },
                {
                  endpointId: 'agent2',
                  hostname: 'host2',
                  type: 'endpoint',
                },
              ],
            },
            externalReferenceStorage: { type: 'elasticSearchDoc' },
            owner: 'securitySolution',
            type: 'externalReference',
          },
          {
            externalReferenceAttachmentTypeId: 'endpoint',
            externalReferenceId: '123',
            externalReferenceMetadata: {
              command: undefined,
              comment: 'No comment provided',
              targets: [
                { endpointId: 'agent1', hostname: 'host1', type: 'endpoint' },
                {
                  endpointId: 'agent2',
                  hostname: 'host2',
                  type: 'endpoint',
                },
              ],
            },
            externalReferenceStorage: { type: 'elasticSearchDoc' },
            owner: 'securitySolution',
            type: 'externalReference',
          },
        ],
      });
    });
  });
});
