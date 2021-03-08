/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import mockAnomalyRecord from './__mocks__/mock_anomaly_record.json';
import mockDetectorsByJob from './__mocks__/mock_detectors_by_job.json';
import mockJobConfig from './__mocks__/mock_job_config.json';

jest.mock('../../services/job_service', () => ({
  mlJobService: {
    getJob() {
      return mockJobConfig;
    },
    detectorsByJob: mockDetectorsByJob,
  },
}));

import { buildConfig } from './explorer_chart_config_builder';

describe('buildConfig', () => {
  test('get dataConfig for anomaly record', () => {
    const dataConfig = buildConfig(mockAnomalyRecord);
    expect(dataConfig).toMatchSnapshot();
  });
});
