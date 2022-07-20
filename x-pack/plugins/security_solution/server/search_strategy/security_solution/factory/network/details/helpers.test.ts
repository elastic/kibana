/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockSearchStrategyResponse, formattedSearchStrategyResponse } from './__mocks__';
import { getNetworkDetailsAgg } from './helpers';

describe('getNetworkDetailsAgg', () => {
  test('should return data correctly', async () => {
    const sourceResult = getNetworkDetailsAgg(
      'source',
      mockSearchStrategyResponse.rawResponse.aggregations!.source
    );
    expect(sourceResult).toEqual({ source: formattedSearchStrategyResponse.networkDetails.source });

    const destinationResult = getNetworkDetailsAgg(
      'destination',
      mockSearchStrategyResponse.rawResponse.aggregations!.destination
    );
    expect(destinationResult).toEqual({
      destination: formattedSearchStrategyResponse.networkDetails.destination,
    });
  });
});
