/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, IUiSettingsClient } from 'kibana/public';
import { of } from 'rxjs';
import { uiActionsPluginMock } from '../../../../../../../src/plugins/ui_actions/public/mocks';
import { dataPluginMock } from '../../../../../../../src/plugins/data/public/mocks';

export const coreStartMock = {
  uiSettings: ({
    get: jest.fn(() => null),
  } as unknown) as IUiSettingsClient,
} as CoreStart;

export const mlStartMock = {
  uiActions: uiActionsPluginMock.createStartContract(),
  data: dataPluginMock.createStartContract(),
  share: {
    urlGenerators: { getUrlGenerator: jest.fn() },
  },
};

export const anomalyDetectorServiceMock = {
  getJobs$: jest.fn((jobId: string[]) => {
    if (jobId.includes('invalid-job-id')) {
      throw new Error('Invalid job');
    }
    return of([
      {
        job_id: 'cw_multi_1',
        analysis_config: { bucket_span: '15m' },
      },
    ]);
  }),
};

export const anomalyExplorerChartsServiceMock = {
  getCombinedJobs: jest.fn(),
  getAnomalyData: jest.fn(),
  setTimeRange: jest.fn(),
  getTimeBounds: jest.fn(),
};
export const mlResultsServiceMock = {
  getMetricData: jest.fn(),
  getRecordsForCriteria: jest.fn(),
  getScheduledEventsByBucket: jest.fn(),
  getEventDistributionData: jest.fn(),
};
export const mlApiServices = {
  jobs: {
    jobForCloning: jest.fn(),
  },
};
