/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { mockAnomalies } from '../mock';
import { cloneDeep } from 'lodash/fp';
import { ExplorerLink } from './create_explorer_link';
import { KibanaContextProvider } from '../../../../../../../../src/plugins/kibana_react/public/context';
import { MlUrlGenerator } from '../../../../../../ml/public/ml_url_generator';

describe('create_explorer_link', () => {
  let anomalies = cloneDeep(mockAnomalies);

  beforeEach(() => {
    anomalies = cloneDeep(mockAnomalies);
  });

  test('it returns expected link', async () => {
    const ml = { urlGenerator: new MlUrlGenerator({ appBasePath: '/app/ml', useHash: false }) };
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
