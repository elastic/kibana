/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { safeDump } from 'js-yaml';
import { generateCustomLogsYml } from './generate_custom_logs_yml';

const baseMockConfig = {
  datasetName: 'my-dataset',
  namespace: 'default',
  logFilePaths: ['/my-service.logs'],
  apiKey: 'elastic:changeme',
  esHost: ['http://localhost:9200'],
  logfileId: 'my-logs-id',
};

describe('generateCustomLogsYml', () => {
  it('should return a basic yml configuration', () => {
    const result = generateCustomLogsYml(baseMockConfig);
    expect(result).toMatchSnapshot();
  });

  it('should return a yml configuration with multiple logFilePaths', () => {
    const mockConfig = {
      ...baseMockConfig,
      logFilePaths: ['/my-service-1.logs', '/my-service-2.logs'],
    };

    const result = generateCustomLogsYml(mockConfig);
    expect(result).toMatchSnapshot();
  });

  it('should return a yml configuration with service name', () => {
    const mockConfig = {
      ...baseMockConfig,
      serviceName: 'my-service',
    };

    const result = generateCustomLogsYml(mockConfig);
    expect(result).toMatchSnapshot();
  });

  it('should return a yml configuration with customConfigurations', () => {
    const mockConfig = {
      ...baseMockConfig,
      customConfigurations: safeDump({
        ['agent.retry']: {
          enabled: true,
          retriesCount: 3,
        },
        ['agent.monitoring']: {
          metrics: false,
        },
      }),
    };

    const result = generateCustomLogsYml(mockConfig);
    expect(result).toMatchSnapshot();
  });
});
