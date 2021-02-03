/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getInitialAlertValues } from './get_initial_alert_values';
import { AlertType, ALERT_TYPES_CONFIG } from '../../../common/alert_types';

test('handles null alert type and undefined service name', () => {
  expect(getInitialAlertValues(null, undefined)).toEqual({ tags: ['apm'] });
});

test('handles valid alert type', () => {
  const alertType = AlertType.ErrorCount;
  expect(getInitialAlertValues(alertType, undefined)).toEqual({
    name: ALERT_TYPES_CONFIG[alertType].name,
    tags: ['apm'],
  });

  expect(getInitialAlertValues(alertType, 'Service Name')).toEqual({
    name: `${ALERT_TYPES_CONFIG[alertType].name} | Service Name`,
    tags: ['apm', `service.name:service name`],
  });
});
