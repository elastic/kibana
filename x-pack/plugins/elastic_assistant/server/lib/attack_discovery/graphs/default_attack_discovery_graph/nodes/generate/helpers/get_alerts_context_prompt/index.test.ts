/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertsContextPrompt } from '.';
import { getDefaultAttackDiscoveryPrompt } from '../../../helpers/get_default_attack_discovery_prompt';

describe('getAlertsContextPrompt', () => {
  it('generates the correct prompt', () => {
    const anonymizedAlerts = ['Alert 1', 'Alert 2', 'Alert 3'];

    const expected = `${getDefaultAttackDiscoveryPrompt()}

Use context from the following alerts to provide insights:

"""
Alert 1

Alert 2

Alert 3
"""
`;

    const prompt = getAlertsContextPrompt({
      anonymizedAlerts,
      attackDiscoveryPrompt: getDefaultAttackDiscoveryPrompt(),
    });

    expect(prompt).toEqual(expected);
  });
});
