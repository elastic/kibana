/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'kibana/server';
import { CaseStatuses } from '../../../common';
import { AlertService, AlertServiceContract } from '.';
import { loggingSystemMock } from 'src/core/server/mocks';
import { ruleRegistryMocks } from '../../../../rule_registry/server/mocks';

describe('updateAlertsStatus', () => {
  const logger = loggingSystemMock.create().get('case');
  const alertsClient = ruleRegistryMocks.createAlertsClientMock.create();

  describe('happy path', () => {
    let alertService: AlertServiceContract;
    const args = {
      alerts: [{ id: 'alert-id-1', index: '.siem-signals', status: CaseStatuses.closed }],
      request: {} as KibanaRequest,
      alertsClient,
      logger,
    };

    beforeEach(async () => {
      alertService = new AlertService();
      jest.restoreAllMocks();
    });

    test('it update the status of the alert correctly', async () => {
      await alertService.updateAlertsStatus(args);

      expect(alertsClient.update).toHaveBeenCalledWith({
        id: 'alert-id-1',
        index: '.siem-signals',
        status: CaseStatuses.closed,
      });
    });

    describe('unhappy path', () => {
      it('ignores empty indices', async () => {
        expect(
          await alertService.updateAlertsStatus({
            alerts: [{ id: 'alert-id-1', index: '', status: CaseStatuses.closed }],
            alertsClient,
            logger,
          })
        ).toBeUndefined();
      });
    });
  });
});
