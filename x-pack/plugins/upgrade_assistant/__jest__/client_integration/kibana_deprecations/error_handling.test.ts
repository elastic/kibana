/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { deprecationsServiceMock } from 'src/core/public/mocks';

import { setupEnvironment } from '../helpers';
import { KibanaTestBed, setupKibanaPage } from './kibana_deprecations.helpers';

describe('Error handling', () => {
  let testBed: KibanaTestBed;
  const { server } = setupEnvironment();
  const deprecationService = deprecationsServiceMock.createStartContract();

  afterAll(() => {
    server.restore();
  });

  test('handles request error', async () => {
    await act(async () => {
      deprecationService.getAllDeprecations = jest
        .fn()
        .mockRejectedValue(new Error('Internal Server Error'));

      testBed = await setupKibanaPage({
        deprecations: deprecationService,
      });
    });

    const { component, exists, find } = testBed;

    component.update();

    expect(exists('kibanaRequestError')).toBe(true);
    expect(find('kibanaRequestError').text()).toContain('Could not retrieve Kibana deprecations');
  });
});
