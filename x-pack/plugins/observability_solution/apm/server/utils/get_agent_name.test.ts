/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAgentName } from './get_agent_name';

describe('getAgentName', () => {
  it('returns agent name by default', () => {
    expect(getAgentName('nodejs', 'go', 'otlp')).toBe('nodejs');
  });

  it('returns telemetry sdk name and telemetry agent name if agent name is not defined', () => {
    expect(getAgentName(null, 'go', 'otlp')).toBe('otlp/go');
  });

  it('returns telemetry agent name if agent name and telemetry sdk are not defined', () => {
    expect(getAgentName(null, 'go', null)).toBe('go');
  });
});
