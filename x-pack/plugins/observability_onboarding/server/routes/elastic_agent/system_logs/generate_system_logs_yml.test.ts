/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateSystemLogsYml } from './generate_system_logs_yml';

const baseMockConfig = {
  namespace: 'default',
  apiKey: 'elastic:changeme',
  esHost: ['http://localhost:9200'],
  uuid: '8df0ff52-6f3b-4b5a-a2da-f06c55d111d1',
};

describe('generateSystemLogsYml', () => {
  it('should return system logs oriented yml configuration', () => {
    const result = generateSystemLogsYml(baseMockConfig);
    expect(result).toMatchSnapshot();
  });
});
