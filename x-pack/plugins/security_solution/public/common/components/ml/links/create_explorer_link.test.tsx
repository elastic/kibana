/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { mockAnomalies } from '../mock';
import { cloneDeep } from 'lodash/fp';
import { ExplorerLink } from './create_explorer_link';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public/context';
import { MlLocatorDefinition } from '@kbn/ml-plugin/public/locator';
import { MockUrlService } from '@kbn/share-plugin/common/mocks';

describe('create_explorer_link', () => {
  let anomalies = cloneDeep(mockAnomalies);

  beforeEach(() => {
    anomalies = cloneDeep(mockAnomalies);
  });

  test('it returns expected link', async () => {
    const urlService = new MockUrlService();
    const locator = urlService.locators.create(new MlLocatorDefinition());
    const ml = { locator };
    const http = { basePath: { get: jest.fn(() => {}) } };

    await act(async () => {
      const { findByText } = render(
        <KibanaContextProvider services={{ ml, http }}>
          <ExplorerLink
            linkName={'Open in Anomaly Explorer'}
            startDate={'1970'}
            endDate={'3000'}
            score={anomalies.anomalies[0]}
          />
        </KibanaContextProvider>
      );

      const url = (await findByText('Open in Anomaly Explorer')).getAttribute('href');

      expect(url).toEqual(
        "/app/ml/explorer?_g=(ml:(jobIds:!(job-1)),refreshInterval:(display:Off,pause:!t,value:0),time:(from:'1970-01-01T00:00:00.000Z',mode:absolute,to:'3000-01-01T00:00:00.000Z'))&_a=(explorer:(mlExplorerFilter:(),mlExplorerSwimlane:()))"
      );
    });
  });
});
