/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { getAnomalySwimLaneEmbeddableFactory } from './anomaly_swimlane_embeddable_factory';
import type { AnomalySwimLaneEmbeddableState } from './types';

jest.mock('./anomaly_swimlane_embeddable', () => ({
  AnomalySwimlaneEmbeddable: jest.fn(),
}));

describe('getAnomalySwimLaneEmbeddableFactory', () => {
  it('should init embeddable api based on provided state', async () => {
    // Mock dependencies
    const pluginStartDeps = { data: dataPluginMock.createStartContract() };

    const getStartServices = coreMock.createSetup({
      pluginStartDeps,
    }).getStartServices;

    const factory = getAnomalySwimLaneEmbeddableFactory(getStartServices);

    // Assert the returned factory
    expect(factory.type).toBe('ml_anomaly_swimlane');

    // Test the buildEmbeddable function
    const state = {
      jobIds: ['my-job-id'],
      swimlaneType: 'overall',
    } as AnomalySwimLaneEmbeddableState;

    const buildApi = jest.fn((v) => v);
    const uuid = '123';

    const embeddable = await factory.buildEmbeddable(state, buildApi, uuid);

    // Assert the returned embeddable api
    expect(embeddable.api).toBeDefined();
    expect(embeddable.api.jobIds.getValue()).toEqual(state.jobIds);
    expect(embeddable.api.swimlaneType.getValue()).toEqual(state.swimlaneType);
  });
});
