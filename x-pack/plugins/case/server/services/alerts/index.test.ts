/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'kibana/server';
import { CaseStatuses } from '../../../common/api';
import { AlertService, AlertServiceContract } from '.';
import { elasticsearchServiceMock } from 'src/core/server/mocks';

describe('updateAlertsStatus', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();

  describe('happy path', () => {
    let alertService: AlertServiceContract;
    const args = {
      ids: ['alert-id-1'],
      indices: new Set<string>(['.siem-signals']),
      request: {} as KibanaRequest,
      status: CaseStatuses.closed,
      scopedClusterClient: esClient,
    };

    beforeEach(async () => {
      alertService = new AlertService();
      jest.restoreAllMocks();
    });

    test('it update the status of the alert correctly', async () => {
      await alertService.updateAlertsStatus(args);

      expect(esClient.updateByQuery).toHaveBeenCalledWith({
        body: {
          query: { ids: { values: args.ids } },
          script: { lang: 'painless', source: `ctx._source.signal.status = '${args.status}'` },
        },
        conflicts: 'abort',
        ignore_unavailable: true,
        index: [...args.indices],
      });
    });

    describe('unhappy path', () => {
      it('ignores empty indices', async () => {
        expect(
          await alertService.updateAlertsStatus({
            ids: ['alert-id-1'],
            status: CaseStatuses.closed,
            indices: new Set<string>(['']),
            scopedClusterClient: esClient,
          })
        ).toBeUndefined();
      });
    });
  });
});
