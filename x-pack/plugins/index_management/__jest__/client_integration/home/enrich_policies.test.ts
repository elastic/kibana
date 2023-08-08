/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { createMemoryHistory } from 'history';

import { API_BASE_PATH } from '../../../common/constants';
import * as fixtures from '../../../test/fixtures';
import { setupEnvironment } from '../helpers';

import {
  EnrichPoliciesTestBed,
  setup,
} from './enrich_policies.helpers';

describe('Enrich policies tab', () => {
  const { httpSetup, httpRequestsMockHelpers, setDelayResponse } = setupEnvironment();
  let testBed: EnrichPoliciesTestBed;

  describe('empty states', () => {
    beforeEach(async () => {
      setDelayResponse(false);
    });

    test('displays a loading prompt', async () => {
      setDelayResponse(true);

      testBed = await setup(httpSetup);

      await act(async () => {
        testBed.actions.goToEnrichPoliciesTab();
      });

      const { exists, component } = testBed;
      component.update();

      expect(exists('sectionLoading')).toBe(true);
    });

    test('displays a error prompt', async () => {
      const error = {
        statusCode: 400,
        error: 'Bad Request',
        message: 'invalid tier names found in ...',
      };

      httpRequestsMockHelpers.setLoadEnrichPoliciesResponse(undefined, error);

      testBed = await setup(httpSetup);

      await act(async () => {
        testBed.actions.goToEnrichPoliciesTab();
      });

      const { exists, component } = testBed;
      component.update();

      expect(exists('sectionError')).toBe(true);
    });
  });
});
