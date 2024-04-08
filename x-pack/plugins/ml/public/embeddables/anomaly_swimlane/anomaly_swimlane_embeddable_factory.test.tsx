/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import {
  ReactEmbeddableRenderer,
  registerReactEmbeddableFactory,
} from '@kbn/embeddable-plugin/public';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE } from '../constants';
import { getAnomalySwimLaneEmbeddableFactory } from './anomaly_swimlane_embeddable_factory';
import type { AnomalySwimLaneEmbeddableApi, AnomalySwimLaneEmbeddableState } from './types';

jest.mock('./anomaly_swimlane_embeddable', () => ({
  AnomalySwimlaneEmbeddable: jest.fn(),
}));

describe('getAnomalySwimLaneEmbeddableFactory', () => {
  // Mock dependencies
  const pluginStartDeps = { data: dataPluginMock.createStartContract() };

  const getStartServices = coreMock.createSetup({
    pluginStartDeps,
  }).getStartServices;

  const factory = getAnomalySwimLaneEmbeddableFactory(getStartServices);

  beforeEach(() => {
    registerReactEmbeddableFactory(ANOMALY_SWIMLANE_EMBEDDABLE_TYPE, async () => {
      return factory;
    });
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
        state={{
          rawState,
        }}
        onApiAvailable={onApiAvailable}
      />
    );

    await waitFor(() => {
      const resultApi = onApiAvailable.mock.calls[0][0];

      expect(resultApi.jobIds.value).toEqual(['my-job']);
      expect(resultApi.viewBy.value).toEqual('overall');
    });
  });
});
