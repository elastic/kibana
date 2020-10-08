/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataProvider } from '../../../timelines/components/timeline/data_providers/data_provider';
import { mockDataProviders } from '../../../timelines/components/timeline/data_providers/mock/mock_data_providers';

import { IdToDataProvider } from './model';
import { registerProviderHandler, unRegisterProviderHandler } from './reducer';

const dataProviders: IdToDataProvider = mockDataProviders.reduce(
  (acc, provider) => ({
    ...acc,
    [provider.id]: provider,
  }),
  {}
);

describe('reducer', () => {
  describe('#registerProviderHandler', () => {
    test('it registers the data provider', () => {
      const provider: DataProvider = {
        ...mockDataProviders[0],
        id: 'abcd',
        name: 'Provider abcd',
      };

      expect(registerProviderHandler({ provider, dataProviders })).toEqual({
        ...dataProviders,
        [provider.id]: provider,
      });
    });
  });

  describe('#unRegisterProviderHandler', () => {
    test('it un-registers the data provider', () => {
      const id = mockDataProviders[0].id;

      const expected = unRegisterProviderHandler({ id, dataProviders });

      expect(Object.keys(expected)).not.toContain(id);
    });
  });
});
