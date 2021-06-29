/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '../../../../../../../src/core/server/mocks';
import { alertsClientMock } from '../../../../../alerting/server/mocks';
import { ruleStatusSavedObjectsClientMock } from '../signals/__mocks__/rule_status_saved_objects_client.mock';
import { deleteRules } from './delete_rules';
import { deleteNotifications } from '../notifications/delete_notifications';
import { deleteRuleActionsSavedObject } from '../rule_actions/delete_rule_actions_saved_object';
import { SavedObjectsFindResult } from '../../../../../../../src/core/server';
import { IRuleStatusSOAttributes } from './types';

jest.mock('../notifications/delete_notifications');
jest.mock('../rule_actions/delete_rule_actions_saved_object');

describe('deleteRules', () => {
  let alertsClient: ReturnType<typeof alertsClientMock.create>;
  let ruleStatusClient: ReturnType<typeof ruleStatusSavedObjectsClientMock.create>;
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(() => {
    alertsClient = alertsClientMock.create();
    savedObjectsClient = savedObjectsClientMock.create();
    ruleStatusClient = ruleStatusSavedObjectsClientMock.create();
  });

  it('should delete the rule along with its notifications, actions, and statuses', async () => {
    const ruleStatus: SavedObjectsFindResult<IRuleStatusSOAttributes> = {
      id: 'statusId',
      type: '',
      references: [],
      attributes: {
        alertId: 'alertId',
        statusDate: '',
        lastFailureAt: null,
        lastFailureMessage: null,
        lastSuccessAt: null,
        lastSuccessMessage: null,
        status: null,
        lastLookBackDate: null,
        gap: null,
        bulkCreateTimeDurations: null,
        searchAfterTimeDurations: null,
      },
      score: 0,
    };

    const rule = {
      alertsClient,
      savedObjectsClient,
      ruleStatusClient,
      id: 'ruleId',
      ruleStatuses: {
        total: 0,
        per_page: 0,
        page: 0,
        saved_objects: [ruleStatus],
      },
    };

    await deleteRules(rule);

    expect(alertsClient.delete).toHaveBeenCalledWith({ id: rule.id });
    expect(deleteNotifications).toHaveBeenCalledWith({
      ruleAlertId: rule.id,
      alertsClient: expect.any(Object),
    });
    expect(deleteRuleActionsSavedObject).toHaveBeenCalledWith({
      ruleAlertId: rule.id,
      savedObjectsClient: expect.any(Object),
    });
    expect(ruleStatusClient.delete).toHaveBeenCalledWith(ruleStatus.id);
  });
});
