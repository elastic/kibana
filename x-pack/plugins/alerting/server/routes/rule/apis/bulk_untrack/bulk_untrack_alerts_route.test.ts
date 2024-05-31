/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { bulkUntrackAlertsRoute } from './bulk_untrack_alerts_route';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { mockHandlerArguments } from '../../../_mock_handler_arguments';
import { rulesClientMock } from '../../../../rules_client.mock';

const rulesClient = rulesClientMock.create();

jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));
beforeEach(() => {
  jest.resetAllMocks();
});

describe('bulkUntrackAlertsRoute', () => {
  it('should call bulkUntrack with the proper values', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    bulkUntrackAlertsRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toBe('/internal/alerting/alerts/_bulk_untrack');

    rulesClient.bulkUntrackAlerts.mockResolvedValueOnce();

    const requestBody = {
      indices: ['test-index'],
      alert_uuids: ['id1', 'id2'],
    };

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        body: requestBody,
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toEqual(undefined);

    expect(rulesClient.bulkUntrackAlerts).toHaveBeenCalledTimes(1);
    expect(rulesClient.bulkUntrackAlerts.mock.calls[0]).toEqual([
      {
        indices: requestBody.indices,
        alertUuids: requestBody.alert_uuids,
        isUsingQuery: false,
      },
    ]);

    expect(res.noContent).toHaveBeenCalled();
  });
});
