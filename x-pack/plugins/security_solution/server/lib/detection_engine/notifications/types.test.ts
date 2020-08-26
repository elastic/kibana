/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loggingSystemMock } from 'src/core/server/mocks';
import { getNotificationResult, getResult } from '../routes/__mocks__/request_responses';
import { isAlertTypes, isNotificationAlertExecutor } from './types';
import { rulesNotificationAlertType } from './rules_notification_alert_type';

describe('types', () => {
  it('isAlertTypes should return true if is RuleNotificationAlertType type', () => {
    expect(isAlertTypes([getNotificationResult()])).toEqual(true);
  });

  it('isAlertTypes should return false if is not RuleNotificationAlertType', () => {
    expect(isAlertTypes([getResult()])).toEqual(false);
  });

  it('isNotificationAlertExecutor should return true it passed object is NotificationAlertTypeDefinition type', () => {
    expect(
      isNotificationAlertExecutor(
        rulesNotificationAlertType({ logger: loggingSystemMock.createLogger() })
      )
    ).toEqual(true);
  });
});
