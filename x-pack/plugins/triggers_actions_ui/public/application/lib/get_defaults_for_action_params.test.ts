/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RecoveredActionGroup } from '@kbn/alerting-plugin/common';
import { AlertProvidedActionVariables } from './action_variables';
import { getDefaultsForActionParams } from './get_defaults_for_action_params';

describe('getDefaultsForActionParams', () => {
  test('pagerduty defaults', async () => {
    expect(getDefaultsForActionParams('.pagerduty', 'test', false)).toEqual({
      dedupKey: `{{${AlertProvidedActionVariables.ruleId}}}:{{${AlertProvidedActionVariables.alertId}}}`,
      eventAction: 'trigger',
    });
  });

  test('pagerduty defaults for recovered action group', async () => {
    expect(getDefaultsForActionParams('.pagerduty', RecoveredActionGroup.id, true)).toEqual({
      dedupKey: `{{${AlertProvidedActionVariables.ruleId}}}:{{${AlertProvidedActionVariables.alertId}}}`,
      eventAction: 'resolve',
    });
  });
});
