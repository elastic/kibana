/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AppTestBed, setup } from './app.helpers';
import { setupEnvironment } from '../helpers/setup_environment';
import { SPECIAL_CHARS_NAME, SPECIAL_CHARS_POLICY } from '../edit_policy/constants';
import { act } from 'react-dom/test-utils';

window.scrollTo = jest.fn();

describe('<App />', () => {
  let testBed: AppTestBed;
  const { server, httpRequestsMockHelpers } = setupEnvironment();
  afterAll(() => {
    server.restore();
  });

  describe('navigation with special characters', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadPolicies([SPECIAL_CHARS_POLICY]);
    });

    test('when clicked on policy name in table', async () => {
      await act(async () => {
        testBed = await setup(['/']);
      });

      const { component, actions } = testBed;
      component.update();

      await actions.clickPolicyNameLink();
      component.update();

      expect(testBed.find('policyTitle').text()).toBe(
        `Edit index lifecycle policy ${SPECIAL_CHARS_NAME}`
      );
    });

    test('when creating a new policy', async () => {
      await act(async () => {
        testBed = await setup(['/']);
      });

      const { component, actions } = testBed;
      component.update();

      await actions.clickCreatePolicyButton();
      component.update();

      expect(testBed.find('policyTitle').text()).toBe(`Create an index lifecycle policy`);
    });

    test('when loading edit policy page url', async () => {
      await act(async () => {
        testBed = await setup([`/policies/edit/${encodeURIComponent(SPECIAL_CHARS_NAME)}`]);
      });

      const { component } = testBed;
      component.update();

      expect(testBed.find('policyTitle').text()).toBe(
        `Edit index lifecycle policy ${SPECIAL_CHARS_NAME}`
      );
    });
  });
});
