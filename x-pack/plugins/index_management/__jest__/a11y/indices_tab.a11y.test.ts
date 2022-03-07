/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { IndicesTestBed, setup } from '../client_integration/home/indices_tab.helpers';
import { setupEnvironment } from '../client_integration/helpers';
import { createDataStreamBackingIndex } from '../client_integration/home/data_streams_tab.helpers';

describe('A11y: indices tab', () => {
  let testBed: IndicesTestBed;
  let server: ReturnType<typeof setupEnvironment>['server'];
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];

  beforeEach(async () => {
    ({ server, httpRequestsMockHelpers } = setupEnvironment());
    httpRequestsMockHelpers.setLoadIndicesResponse([
      createDataStreamBackingIndex('data-stream-index', '%dataStream'),
      createDataStreamBackingIndex('data-stream-index2', 'dataStream2'),
    ]);
    await act(async () => {
      testBed = await setup();
    });

    const { component } = testBed;
    component.update();
  });

  afterAll(() => {
    server.restore();
  });

  it('indices table', async () => {
    await testBed.a11y.assertA11y();
  });
});
