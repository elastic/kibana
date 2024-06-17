/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { setStubKibanaServices } from '@kbn/presentation-panel-plugin/public/mocks';
import { render, waitFor, screen } from '@testing-library/react';
import React from 'react';
import { of } from 'rxjs';
import { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE } from '../constants';
import { getAnomalySwimLaneEmbeddableFactory } from './anomaly_swimlane_embeddable_factory';
import type { AnomalySwimLaneEmbeddableApi, AnomalySwimLaneEmbeddableState } from './types';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';

// Mock dependencies
const pluginStartDeps = {
  data: dataPluginMock.createStartContract(),
  charts: chartPluginMock.createStartContract(),
};

const getStartServices = coreMock.createSetup({
  pluginStartDeps,
}).getStartServices;

const mockResponse = of([
  {
    job_id: 'my-job',
    analysis_config: { bucket_span: '15m' },
  },
]);

jest.mock('../../application/services/anomaly_detector_service', () => {
  return {
    AnomalyDetectorService: jest.fn().mockImplementation(() => {
      return {
        getJobs$: jest.fn((jobId: string[]) => {
          if (jobId.includes('invalid-job-id')) {
            throw new Error('Invalid job');
          }
          return mockResponse;
        }),
      };
    }),
  };
});

jest.mock('../../application/services/anomaly_timeline_service', () => {
  return {
    AnomalyTimelineService: jest.fn().mockImplementation(() => {
      return {
        setTimeRange: jest.fn(),
        loadOverallData: jest.fn(() =>
          Promise.resolve({
            earliest: 0,
            latest: 0,
            points: [],
            interval: 3600,
          })
        ),
        loadViewBySwimlane: jest.fn(() =>
          Promise.resolve({
            points: [],
          })
        ),
        getSwimlaneBucketInterval: jest.fn(() => {
          return {
            asSeconds: jest.fn(() => 900),
          };
        }),
      };
    }),
  };
});

describe('getAnomalySwimLaneEmbeddableFactory', () => {
  const factory = getAnomalySwimLaneEmbeddableFactory(getStartServices);

  beforeAll(() => {
    const embeddable = embeddablePluginMock.createSetupContract();
    embeddable.registerReactEmbeddableFactory(ANOMALY_SWIMLANE_EMBEDDABLE_TYPE, async () => {
      return factory;
    });
    setStubKibanaServices();
  });

  it('should init embeddable api based on provided state', async () => {
    const rawState = { jobIds: ['my-job'], viewBy: 'overall' } as AnomalySwimLaneEmbeddableState;

    const onApiAvailable = jest.fn() as jest.MockedFunction<
      (api: AnomalySwimLaneEmbeddableApi) => void
    >;

    render(
      <ReactEmbeddableRenderer<AnomalySwimLaneEmbeddableState, AnomalySwimLaneEmbeddableApi>
        maybeId={'maybe_id'}
        type={ANOMALY_SWIMLANE_EMBEDDABLE_TYPE}
        onApiAvailable={onApiAvailable}
        getParentApi={() => ({
          getSerializedStateForChild: () => ({ rawState }),
          executionContext: {
            type: 'dashboard',
            id: 'dashboard-id',
          },
        })}
      />
    );

    await waitFor(() => {
      const resultApi = onApiAvailable.mock.calls[0][0];

      expect(resultApi.dataLoading!.value).toEqual(false);
      expect(resultApi.jobIds.value).toEqual(['my-job']);
      expect(resultApi.viewBy.value).toEqual('overall');

      expect(screen.getByTestId<HTMLElement>('mlSwimLaneEmbeddable_maybe_id')).toBeInTheDocument();
    });
  });
});
