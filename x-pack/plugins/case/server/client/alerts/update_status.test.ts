/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CaseStatuses } from '../../../common/api';
import { createMockSavedObjectsRepository } from '../../routes/api/__fixtures__';
import { createCaseClientWithMockSavedObjectsClient } from '../mocks';

describe('updateAlertsStatus', () => {
  describe('happy path', () => {
    test('it update the status of the alert correctly', async () => {
      const savedObjectsClient = createMockSavedObjectsRepository();

      const caseClient = await createCaseClientWithMockSavedObjectsClient({ savedObjectsClient });
      await caseClient.client.updateAlertsStatus({
        ids: ['alert-id-1'],
        status: CaseStatuses.closed,
      });

      expect(caseClient.services.alertsService.updateAlertsStatus).toHaveBeenCalledWith({
        ids: ['alert-id-1'],
        index: '.siem-signals',
        request: {},
        status: CaseStatuses.closed,
      });
    });

    describe('unhappy path', () => {
      test('it throws when missing securitySolutionClient', async () => {
        expect.assertions(3);

        const savedObjectsClient = createMockSavedObjectsRepository();

        const caseClient = await createCaseClientWithMockSavedObjectsClient({
          savedObjectsClient,
          omitFromContext: ['securitySolution'],
        });
        caseClient.client
          .updateAlertsStatus({
            ids: ['alert-id-1'],
            status: CaseStatuses.closed,
          })
          .catch((e) => {
            expect(e).not.toBeNull();
            expect(e.isBoom).toBe(true);
            expect(e.output.statusCode).toBe(404);
          });
      });
    });
  });
});
