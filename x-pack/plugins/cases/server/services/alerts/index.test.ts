/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseStatuses } from '../../../common';
import { AlertService, AlertServiceContract } from '.';
import { loggingSystemMock } from 'src/core/server/mocks';
import { ruleRegistryMocks } from '../../../../rule_registry/server/mocks';
import { AlertsClient } from '../../../../rule_registry/server';
import { PublicMethodsOf } from '@kbn/utility-types';

describe('updateAlertsStatus', () => {
  const logger = loggingSystemMock.create().get('case');
  let alertsClient: jest.Mocked<PublicMethodsOf<AlertsClient>>;
  let alertService: AlertServiceContract;

  beforeEach(async () => {
    alertsClient = ruleRegistryMocks.createAlertsClientMock.create();
    alertService = new AlertService(alertsClient);
    jest.restoreAllMocks();
  });

  describe('happy path', () => {
    const args = {
      alerts: [{ id: 'alert-id-1', index: '.siem-signals', status: CaseStatuses.closed }],
      logger,
    };

    it('updates the status of the alert correctly', async () => {
      await alertService.updateAlertsStatus(args);

      expect(alertsClient.update).toHaveBeenCalledWith({
        id: 'alert-id-1',
        index: '.siem-signals',
        status: CaseStatuses.closed,
      });
    });

    it('translates the in-progress status to acknowledged', async () => {
      await alertService.updateAlertsStatus({
        alerts: [{ id: 'alert-id-1', index: '.siem-signals', status: CaseStatuses['in-progress'] }],
        logger,
      });

      expect(alertsClient.update).toHaveBeenCalledWith({
        id: 'alert-id-1',
        index: '.siem-signals',
        status: 'acknowledged',
      });
    });

    it('defaults an unknown status to open', async () => {
      await alertService.updateAlertsStatus({
        alerts: [{ id: 'alert-id-1', index: '.siem-signals', status: 'bananas' as CaseStatuses }],
        logger,
      });

      expect(alertsClient.update).toHaveBeenCalledWith({
        id: 'alert-id-1',
        index: '.siem-signals',
        status: 'open',
      });
    });
  });

  describe('unhappy path', () => {
    it('ignores empty indices', async () => {
      expect(
        await alertService.updateAlertsStatus({
          alerts: [{ id: 'alert-id-1', index: '', status: CaseStatuses.closed }],
          logger,
        })
      ).toBeUndefined();
    });
  });
});
