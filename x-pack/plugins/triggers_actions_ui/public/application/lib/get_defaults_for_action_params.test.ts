/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RecoveredActionGroup } from '../../../../alerts/common';
import { AlertProvidedActionVariables } from './action_variables';
import { getDefaultsForActionParams } from './get_defaults_for_action_params';

describe('getDefaultsForActionParams', () => {
  test('pagerduty defaults', async () => {
    expect(getDefaultsForActionParams('.pagerduty', 'test')).toEqual({
      dedupKey: `{{${AlertProvidedActionVariables.alertId}}}:{{${AlertProvidedActionVariables.alertInstanceId}}}`,
      eventAction: 'trigger',
    });
  });

  test('pagerduty defaults for recovered action group', async () => {
    expect(getDefaultsForActionParams('.pagerduty', RecoveredActionGroup.id)).toEqual({
      dedupKey: `{{${AlertProvidedActionVariables.alertId}}}:{{${AlertProvidedActionVariables.alertInstanceId}}}`,
      eventAction: 'resolve',
    });
  });
});
