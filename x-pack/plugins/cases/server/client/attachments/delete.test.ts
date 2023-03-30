/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockCaseComments } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import { deleteComment } from './delete';

describe('deleteComment', () => {
  const clientArgs = createCasesClientMockArgs();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Alerts', () => {
    const commentSO = mockCaseComments[0];
    const alertsSO = mockCaseComments[3];
    clientArgs.services.attachmentService.getter.get.mockResolvedValue(alertsSO);

    it('delete alerts correctly', async () => {
      await deleteComment({ caseID: 'mock-id-4', attachmentID: 'mock-comment-4' }, clientArgs);

      expect(clientArgs.services.alertsService.ensureAlertsAuthorized).toHaveBeenCalledWith({
        alerts: [{ id: 'test-id', index: 'test-index' }],
      });

      expect(clientArgs.services.alertsService.removeAlertsFromCase).toHaveBeenCalledWith({
        alerts: [{ id: 'test-id', index: 'test-index' }],
        caseId: 'mock-id-4',
      });
    });

    it('does not call the alert service when the attachment is not an alert', async () => {
      clientArgs.services.attachmentService.getter.get.mockResolvedValue(commentSO);
      await deleteComment({ caseID: 'mock-id-1', attachmentID: 'mock-comment-1' }, clientArgs);

      expect(clientArgs.services.alertsService.ensureAlertsAuthorized).not.toHaveBeenCalledWith();

      expect(clientArgs.services.alertsService.removeAlertsFromCase).not.toHaveBeenCalledWith();
    });
  });
});
