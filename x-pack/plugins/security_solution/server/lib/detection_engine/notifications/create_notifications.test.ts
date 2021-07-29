/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '../../../../../alerting/server/mocks';
import { createNotifications } from './create_notifications';

describe('createNotifications', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;

  beforeEach(() => {
    rulesClient = rulesClientMock.create();
  });

  it('calls the rulesClient with proper params', async () => {
    const ruleAlertId = 'rule-04128c15-0d1b-4716-a4c5-46997ac7f3bd';

    await createNotifications({
      rulesClient,
      actions: [],
      ruleAlertId,
      enabled: true,
      interval: '',
      name: '',
    });

    expect(rulesClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          params: expect.objectContaining({
            ruleAlertId,
          }),
        }),
      })
    );
  });

  it('calls the rulesClient with transformed actions', async () => {
    const action = {
      group: 'default',
      id: '99403909-ca9b-49ba-9d7a-7e5320e68d05',
      params: { message: 'Rule generated {{state.signals_count}} signals' },
      action_type_id: '.slack',
    };
    await createNotifications({
      rulesClient,
      actions: [action],
      ruleAlertId: 'new-rule-id',
      enabled: true,
      interval: '',
      name: '',
    });

    expect(rulesClient.create).toHaveBeenCalledWith(
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
