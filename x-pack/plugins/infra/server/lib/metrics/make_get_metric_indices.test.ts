/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { defaultSourceConfiguration, InfraSource } from '../sources';
import { createInfraSourcesMock } from '../sources/mocks';
import { makeGetMetricIndices } from './make_get_metric_indices';

describe('getMetricIndices', () => {
  it('should return the indices from a resolved configuration', async () => {
    const sourceConfiguration: InfraSource = {
      id: 'default',
      origin: 'stored',
      configuration: defaultSourceConfiguration,
    };
    const infraSourcesMock = createInfraSourcesMock();
    infraSourcesMock.getSourceConfiguration.mockResolvedValueOnce(sourceConfiguration);

    const getMetricIndices = makeGetMetricIndices(infraSourcesMock);

    const savedObjectsClient = savedObjectsClientMock.create();
    const metricIndices = await getMetricIndices(savedObjectsClient);

    expect(metricIndices).toEqual(defaultSourceConfiguration.metricAlias);
  });
});
