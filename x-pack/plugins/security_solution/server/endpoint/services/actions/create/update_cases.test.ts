/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateCases } from './update_cases';
import type { CasesClient } from '@kbn/cases-plugin/server';
import type { CreateActionPayload } from './types';

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
  const caseIds = ['case1', 'case2'];

  const getDefaultPayload = () =>
    ({
      command: 'isolate',
      comment: 'Isolating host',
      action_id: '123',
      endpoint_ids: ['abc123'],
    } as CreateActionPayload);

  it('updates cases when casesClient and caseIDs provided', async () => {
    (mockCasesClient.cases.getCasesByAlertID as jest.Mock).mockResolvedValue(caseIds);

    await updateCases({
      casesClient: mockCasesClient,
      createActionPayload: {
        ...getDefaultPayload(),
        case_ids: caseIds,
      },
      endpointData: [],
    });

    expect(mockCasesClient.attachments.bulkCreate).toHaveBeenCalledTimes(2);
  });

  it('should return early if casesClient is undefined', async () => {
    await updateCases({
      casesClient: undefined,
      createActionPayload: {
        ...getDefaultPayload(),
        alert_ids: ['alert1'],
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
  it('does not update if no case IDs', async () => {
    await updateCases({
      casesClient: mockCasesClient,
      createActionPayload: getDefaultPayload(),
      endpointData: [],
    });

    expect(mockCasesClient.attachments.bulkCreate).not.toHaveBeenCalled();
  });
  it('should get cases by alert IDs and update them', async () => {
    (mockCasesClient.cases.getCasesByAlertID as jest.Mock).mockResolvedValueOnce([{ id: 'case1' }]);

    await updateCases({
      casesClient: mockCasesClient,
      createActionPayload: {
        ...getDefaultPayload(),
        alert_ids: ['alert1'],
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
      createActionPayload: getDefaultPayload(),
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

  it('creates expected attachments for each case', async () => {
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
        case_ids: caseIds,
        ...getDefaultPayload(),
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
            command: 'isolate',
            comment: 'Isolating host',
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
            command: 'isolate',
            comment: 'Isolating host',
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
