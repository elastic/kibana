/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AppTestBed, setup } from './app.helpers';
import { setupEnvironment } from '../helpers/setup_environment';
import { getDefaultHotPhasePolicy, POLICY_NAME } from '../edit_policy/constants';
import { act } from 'react-dom/test-utils';

const SPECIAL_CHARS_NAME = 'test?#$+=&@:';
const DOLLAR_SIGN_NAME = 'test%';
// navigation doesn't work for % with other special chars or sequence %25
// known issue https://github.com/elastic/kibana/issues/82440
const DOLLAR_SIGN_WITH_OTHER_CHARS_NAME = 'test%#';
const DOLLAR_SIGN_25_SEQUENCE = 'test%25';

window.scrollTo = jest.fn();

describe('<App />', () => {
  let testBed: AppTestBed;
  const { server, httpRequestsMockHelpers } = setupEnvironment();
  afterAll(() => {
    server.restore();
  });

  describe('new policy creation', () => {
    test('when there are no policies', async () => {
      httpRequestsMockHelpers.setLoadPolicies([]);
      await act(async () => {
        testBed = await setup(['/']);
      });

      const { component, actions } = testBed;
      component.update();

      await actions.clickCreatePolicyButton();
      component.update();

      expect(testBed.find('policyTitle').text()).toBe(`Create an index lifecycle policy`);
    });

    test('when there are policies', async () => {
      httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy(POLICY_NAME)]);
      await act(async () => {
        testBed = await setup(['/']);
      });

      const { component, actions } = testBed;
      component.update();

      await actions.clickCreatePolicyButton();
      component.update();

      expect(testBed.find('policyTitle').text()).toBe(`Create an index lifecycle policy`);
    });
  });

  describe('navigation with special characters', () => {
    beforeAll(async () => {
      httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy(SPECIAL_CHARS_NAME)]);
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

    test('when loading edit policy page url with double encoding', async () => {
      await act(async () => {
        testBed = await setup([
          encodeURI(`/policies/edit/${encodeURIComponent(SPECIAL_CHARS_NAME)}`),
        ]);
      });

      const { component } = testBed;
      component.update();

      expect(testBed.find('policyTitle').text()).toBe(
        `Edit index lifecycle policy ${SPECIAL_CHARS_NAME}`
      );
    });
  });

  describe('navigation with dollar sign', () => {
    beforeAll(async () => {
      httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy(DOLLAR_SIGN_NAME)]);
    });

    test('when loading edit policy page url', async () => {
      await act(async () => {
        testBed = await setup([`/policies/edit/${encodeURIComponent(DOLLAR_SIGN_NAME)}`]);
      });

      const { component } = testBed;
      component.update();

      expect(testBed.find('policyTitle').text()).toBe(
        `Edit index lifecycle policy ${DOLLAR_SIGN_NAME}`
      );
    });

    test('when loading edit policy page url with double encoding', async () => {
      await act(async () => {
        testBed = await setup([
          encodeURI(`/policies/edit/${encodeURIComponent(DOLLAR_SIGN_NAME)}`),
        ]);
      });

      const { component } = testBed;
      component.update();

      expect(testBed.find('policyTitle').text()).toBe(
        `Edit index lifecycle policy ${DOLLAR_SIGN_NAME}`
      );
    });
  });

  describe('navigation with dollar sign with other special characters', () => {
    beforeAll(async () => {
      httpRequestsMockHelpers.setLoadPolicies([
        getDefaultHotPhasePolicy(DOLLAR_SIGN_WITH_OTHER_CHARS_NAME),
      ]);
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
        `Edit index lifecycle policy ${DOLLAR_SIGN_WITH_OTHER_CHARS_NAME}`
      );
    });

    test('when loading edit policy page url', async () => {
      await act(async () => {
        testBed = await setup([
          `/policies/edit/${encodeURIComponent(DOLLAR_SIGN_WITH_OTHER_CHARS_NAME)}`,
        ]);
      });

      const { component } = testBed;
      component.update();

      // known issue https://github.com/elastic/kibana/issues/82440
      expect(testBed.find('policyTitle').text()).not.toBe(
        `Edit index lifecycle policy ${DOLLAR_SIGN_WITH_OTHER_CHARS_NAME}`
      );
    });

    test('when loading edit policy page url with double encoding', async () => {
      await act(async () => {
        testBed = await setup([
          encodeURI(`/policies/edit/${encodeURIComponent(DOLLAR_SIGN_WITH_OTHER_CHARS_NAME)}`),
        ]);
      });

      const { component } = testBed;
      component.update();

      expect(testBed.find('policyTitle').text()).toBe(
        `Edit index lifecycle policy ${DOLLAR_SIGN_WITH_OTHER_CHARS_NAME}`
      );
    });
  });

  describe('navigation with %25 sequence', () => {
    beforeAll(async () => {
      httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy(DOLLAR_SIGN_25_SEQUENCE)]);
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
        `Edit index lifecycle policy ${DOLLAR_SIGN_25_SEQUENCE}`
      );
    });

    test('when loading edit policy page url', async () => {
      await act(async () => {
        testBed = await setup([`/policies/edit/${encodeURIComponent(DOLLAR_SIGN_25_SEQUENCE)}`]);
      });

      const { component } = testBed;
      component.update();

      // known issue https://github.com/elastic/kibana/issues/82440
      expect(testBed.find('policyTitle').text()).not.toBe(
        `Edit index lifecycle policy ${DOLLAR_SIGN_25_SEQUENCE}`
      );
    });

    test('when loading edit policy page url with double encoding', async () => {
      await act(async () => {
        testBed = await setup([
          encodeURI(`/policies/edit/${encodeURIComponent(DOLLAR_SIGN_25_SEQUENCE)}`),
        ]);
      });

      const { component } = testBed;
      component.update();

      expect(testBed.find('policyTitle').text()).toBe(
        `Edit index lifecycle policy ${DOLLAR_SIGN_25_SEQUENCE}`
      );
    });
  });
});
