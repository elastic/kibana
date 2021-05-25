/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseStatuses } from '../../../common';
import { createMockSavedObjectsRepository } from '../../routes/api/__fixtures__';
import { createCasesClientWithMockSavedObjectsClient } from '../mocks';

describe('updateAlertsStatus', () => {
  it('updates the status of the alert correctly', async () => {
    const savedObjectsClient = createMockSavedObjectsRepository();

    const casesClient = await createCasesClientWithMockSavedObjectsClient({ savedObjectsClient });
    await casesClient.client.updateAlertsStatus({
      alerts: [{ id: 'alert-id-1', index: '.siem-signals', status: CaseStatuses.closed }],
    });

    expect(casesClient.services.alertsService.updateAlertsStatus).toHaveBeenCalledWith({
      logger: expect.anything(),
      scopedClusterClient: expect.anything(),
      alerts: [{ id: 'alert-id-1', index: '.siem-signals', status: CaseStatuses.closed }],
    });
  });
});
