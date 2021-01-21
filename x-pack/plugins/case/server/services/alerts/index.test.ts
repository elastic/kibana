/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'kibana/server';
import { elasticsearchServiceMock } from '../../../../../../src/core/server/mocks';
import { CaseStatuses } from '../../../common/api';
import { AlertService, AlertServiceContract } from '.';

describe('updateAlertsStatus', () => {
  const esClientMock = elasticsearchServiceMock.createClusterClient();

  describe('happy path', () => {
    let alertService: AlertServiceContract;
    const args = {
      ids: ['alert-id-1'],
      index: '.siem-signals',
      request: {} as KibanaRequest,
      status: CaseStatuses.closed,
    };

    beforeEach(async () => {
      alertService = new AlertService();
      jest.restoreAllMocks();
    });

    test('it update the status of the alert correctly', async () => {
      alertService.initialize(esClientMock);
      await alertService.updateAlertsStatus(args);

      expect(esClientMock.asScoped().asCurrentUser.updateByQuery).toHaveBeenCalledWith({
        body: {
          query: { ids: { values: args.ids } },
          script: { lang: 'painless', source: `ctx._source.signal.status = '${args.status}'` },
        },
        conflicts: 'abort',
        ignore_unavailable: true,
        index: args.index,
      });
    });

    describe('unhappy path', () => {
      test('it throws when service is already initialized', async () => {
        alertService.initialize(esClientMock);
        expect(() => {
          alertService.initialize(esClientMock);
        }).toThrow();
      });

      test('it throws when service is not initialized and try to update the status', async () => {
        await expect(alertService.updateAlertsStatus(args)).rejects.toThrow();
      });
    });
  });
});
