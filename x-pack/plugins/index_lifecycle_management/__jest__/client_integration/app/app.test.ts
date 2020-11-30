/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AppTestBed,
  getDoubleEncodedPolicyEditPath,
  getEncodedPolicyEditPath,
  setup,
} from './app.helpers';
import { setupEnvironment } from '../helpers/setup_environment';
import { getDefaultHotPhasePolicy, POLICY_NAME } from '../edit_policy/constants';
import { act } from 'react-dom/test-utils';

const SPECIAL_CHARS_NAME = 'test?#$+=&@:';
const PERCENT_SIGN_NAME = 'test%';
// navigation doesn't work for % with other special chars or sequence %25
// known issue https://github.com/elastic/kibana/issues/82440
const PERCENT_SIGN_WITH_OTHER_CHARS_NAME = 'test%#';
const PERCENT_SIGN_25_SEQUENCE = 'test%25';

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
      expect(testBed.find('policyNameField').props().value).toBe('');
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
      expect(testBed.find('policyNameField').props().value).toBe('');
    });
  });

  describe('navigation with special characters', () => {
    beforeAll(async () => {
      httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy(SPECIAL_CHARS_NAME)]);
    });

    test('clicking policy name in the table works', async () => {
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

    test('loading edit policy page url works', async () => {
      await act(async () => {
        testBed = await setup([getEncodedPolicyEditPath(SPECIAL_CHARS_NAME)]);
      });

      const { component } = testBed;
      component.update();

      expect(testBed.find('policyTitle').text()).toBe(
        `Edit index lifecycle policy ${SPECIAL_CHARS_NAME}`
      );
    });

    // using double encoding to counteract react-router's v5 internal decodeURI call
    // when those links are open in a new tab, address bar contains double encoded url
    test('loading edit policy page url with double encoding works', async () => {
      await act(async () => {
        testBed = await setup([getDoubleEncodedPolicyEditPath(SPECIAL_CHARS_NAME)]);
      });

      const { component } = testBed;
      component.update();

      expect(testBed.find('policyTitle').text()).toBe(
        `Edit index lifecycle policy ${SPECIAL_CHARS_NAME}`
      );
    });
  });

  describe('navigation with percent sign', () => {
    beforeAll(async () => {
      httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy(PERCENT_SIGN_NAME)]);
    });

    test('loading edit policy page url works', async () => {
      await act(async () => {
        testBed = await setup([getEncodedPolicyEditPath(PERCENT_SIGN_NAME)]);
      });

      const { component } = testBed;
      component.update();

      expect(testBed.find('policyTitle').text()).toBe(
        `Edit index lifecycle policy ${PERCENT_SIGN_NAME}`
      );
    });

    test('loading edit policy page url with double encoding works', async () => {
      await act(async () => {
        testBed = await setup([getDoubleEncodedPolicyEditPath(PERCENT_SIGN_NAME)]);
      });

      const { component } = testBed;
      component.update();

      expect(testBed.find('policyTitle').text()).toBe(
        `Edit index lifecycle policy ${PERCENT_SIGN_NAME}`
      );
    });
  });

  describe('navigation with percent sign with other special characters', () => {
    beforeAll(async () => {
      httpRequestsMockHelpers.setLoadPolicies([
        getDefaultHotPhasePolicy(PERCENT_SIGN_WITH_OTHER_CHARS_NAME),
      ]);
    });

    test('clicking policy name in the table works', async () => {
      await act(async () => {
        testBed = await setup(['/']);
      });

      const { component, actions } = testBed;
      component.update();

      await actions.clickPolicyNameLink();
      component.update();

      expect(testBed.find('policyTitle').text()).toBe(
        `Edit index lifecycle policy ${PERCENT_SIGN_WITH_OTHER_CHARS_NAME}`
      );
    });

    test("loading edit policy page url doesn't work", async () => {
      await act(async () => {
        testBed = await setup([getEncodedPolicyEditPath(PERCENT_SIGN_WITH_OTHER_CHARS_NAME)]);
      });

      const { component } = testBed;
      component.update();

      // known issue https://github.com/elastic/kibana/issues/82440
      expect(testBed.find('policyTitle').text()).not.toBe(
        `Edit index lifecycle policy ${PERCENT_SIGN_WITH_OTHER_CHARS_NAME}`
      );
    });

    // using double encoding to counteract react-router's v5 internal decodeURI call
    // when those links are open in a new tab, address bar contains double encoded url
    test('loading edit policy page url with double encoding works', async () => {
      await act(async () => {
        testBed = await setup([getDoubleEncodedPolicyEditPath(PERCENT_SIGN_WITH_OTHER_CHARS_NAME)]);
      });

      const { component } = testBed;
      component.update();

      expect(testBed.find('policyTitle').text()).toBe(
        `Edit index lifecycle policy ${PERCENT_SIGN_WITH_OTHER_CHARS_NAME}`
      );
    });
  });

  describe('navigation with %25 sequence', () => {
    beforeAll(async () => {
      httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy(PERCENT_SIGN_25_SEQUENCE)]);
    });

    test('clicking policy name in the table works correctly', async () => {
      await act(async () => {
        testBed = await setup(['/']);
      });

      const { component, actions } = testBed;
      component.update();

      await actions.clickPolicyNameLink();
      component.update();

      expect(testBed.find('policyTitle').text()).toBe(
        `Edit index lifecycle policy ${PERCENT_SIGN_25_SEQUENCE}`
      );
    });

    test("loading edit policy page url doesn't work", async () => {
      await act(async () => {
        testBed = await setup([getEncodedPolicyEditPath(PERCENT_SIGN_25_SEQUENCE)]);
      });

      const { component } = testBed;
      component.update();

      // known issue https://github.com/elastic/kibana/issues/82440
      expect(testBed.find('policyTitle').text()).not.toBe(
        `Edit index lifecycle policy ${PERCENT_SIGN_25_SEQUENCE}`
      );
    });

    // using double encoding to counteract react-router's v5 internal decodeURI call
    // when those links are open in a new tab, address bar contains double encoded url
    test('loading edit policy page url with double encoding works', async () => {
      await act(async () => {
        testBed = await setup([getDoubleEncodedPolicyEditPath(PERCENT_SIGN_25_SEQUENCE)]);
      });

      const { component } = testBed;
      component.update();

      expect(testBed.find('policyTitle').text()).toBe(
        `Edit index lifecycle policy ${PERCENT_SIGN_25_SEQUENCE}`
      );
    });
  });
});
