/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { alertsClientMock } from '../../../../../alerts/server/mocks';
import { createNotifications } from './create_notifications';

describe('createNotifications', () => {
  let alertsClient: ReturnType<typeof alertsClientMock.create>;

  beforeEach(() => {
    alertsClient = alertsClientMock.create();
  });

  it('calls the alertsClient with proper params', async () => {
    const ruleAlertId = 'rule-04128c15-0d1b-4716-a4c5-46997ac7f3bd';

    await createNotifications({
      alertsClient,
      actions: [],
      ruleAlertId,
      enabled: true,
      interval: '',
      name: '',
    });

    expect(alertsClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          params: expect.objectContaining({
            ruleAlertId,
          }),
        }),
      })
    );
  });

  it('calls the alertsClient with transformed actions', async () => {
    const action = {
      group: 'default',
      id: '99403909-ca9b-49ba-9d7a-7e5320e68d05',
      params: { message: 'Rule generated {{state.signals_count}} signals' },
      action_type_id: '.slack',
    };
    await createNotifications({
      alertsClient,
      actions: [action],
      ruleAlertId: 'new-rule-id',
      enabled: true,
      interval: '',
      name: '',
    });

    expect(alertsClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actions: expect.arrayContaining([
            {
              group: action.group,
              id: action.id,
              params: action.params,
              actionTypeId: '.slack',
            },
          ]),
        }),
      })
    );
  });
});
