/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnomalyExplorerEmbeddableFactory } from './anomaly_explorer_embeddable_factory';
import { coreMock } from '../../../../../../src/core/public/mocks';
import { dataPluginMock } from '../../../../../../src/plugins/data/public/mocks';
import { AnomalyExplorerEmbeddable } from './anomaly_explorer_embeddable';
import { AnomalyExplorerEmbeddableInput } from '..';

jest.mock('./anomaly_explorer_embeddable', () => ({
  AnomalyExplorerEmbeddable: jest.fn(),
}));

describe('AnomalyExplorerEmbeddableFactory', () => {
  test('should provide required services on create', async () => {
    // arrange
    const pluginStartDeps = { data: dataPluginMock.createStartContract() };

    const getStartServices = coreMock.createSetup({
      pluginStartDeps,
    }).getStartServices;

    const [coreStart, pluginsStart] = await getStartServices();

    // act
    const factory = new AnomalyExplorerEmbeddableFactory(getStartServices);

    await factory.create({
      jobIds: ['test-job'],
      maxSeriesToPlot: 4,
    } as AnomalyExplorerEmbeddableInput);

    // assert
    const mockCalls = ((AnomalyExplorerEmbeddable as unknown) as jest.Mock<AnomalyExplorerEmbeddable>)
      .mock.calls[0];
    const input = mockCalls[0];
    const createServices = mockCalls[1];

    expect(input).toEqual({
      jobIds: ['test-job'],
      maxSeriesToPlot: 4,
    });
    expect(Object.keys(createServices[0])).toEqual(Object.keys(coreStart));
    expect(createServices[1]).toMatchObject(pluginsStart);
    expect(Object.keys(createServices[2])).toEqual([
      'anomalyDetectorService',
      'anomalyExplorerService',
      'mlResultsService',
    ]);
  });
});
