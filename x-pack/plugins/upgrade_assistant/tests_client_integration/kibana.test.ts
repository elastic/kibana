/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DomainDeprecationDetails } from 'kibana/public';
import { act } from 'react-dom/test-utils';
import { deprecationsServiceMock } from 'src/core/public/mocks';

import { KibanaTestBed, setupKibanaPage, setupEnvironment } from './helpers';

describe('Kibana deprecations', () => {
  let testBed: KibanaTestBed;
  const { server } = setupEnvironment();

  afterAll(() => {
    server.restore();
  });

  describe('With deprecations', () => {
    const kibanaDeprecationsMockResponse: DomainDeprecationDetails[] = [
      {
        correctiveActions: {},
        domainId: 'xpack.spaces',
        level: 'critical',
        message:
          'Disabling the spaces plugin (xpack.spaces.enabled) will not be supported in the next major version (8.0)',
      },
    ];

    beforeEach(async () => {
      await act(async () => {
        const deprecationService = deprecationsServiceMock.createStartContract();
        deprecationService.getAllDeprecations = jest
          .fn()
          .mockReturnValue(kibanaDeprecationsMockResponse);

        testBed = await setupKibanaPage({
          deprecations: deprecationService,
        });
      });
    });

    test('renders deprecations', () => {
      const { exists, find } = testBed;
      expect(exists('kibanaDeprecationsContent')).toBe(true);
      expect(find('kibanaDeprecationItem').length).toEqual(1);
    });
  });

  describe('No deprecations', () => {
    beforeEach(async () => {
      await act(async () => {
        testBed = await setupKibanaPage({ isReadOnlyMode: false });
      });

      const { component } = testBed;

      component.update();
    });

    test('renders prompt', () => {
      const { exists, find } = testBed;
      expect(exists('noDeprecationsPrompt')).toBe(true);
      expect(find('noDeprecationsPrompt').text()).toContain('Ready to upgrade!');
    });
  });

  describe('Error handling', () => {
    test('handles request error', async () => {
      await act(async () => {
        const deprecationService = deprecationsServiceMock.createStartContract();
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
      expect(find('kibanaRequestError').text()).toContain(
        'Could not retrieve Kibana deprecations.'
      );
    });
  });
});
