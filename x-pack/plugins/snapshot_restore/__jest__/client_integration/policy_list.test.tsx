/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { setupEnvironment, nextTick } from './helpers';
import { getPolicy } from '../../test/fixtures';
import { setupPoliciesListPage, PoliciesListTestBed } from './helpers/policy_list.helpers';

const POLICY_WITH_GLOBAL_STATE = getPolicy({
  name: 'with_state',
  retention: { minCount: 1 },
  config: { includeGlobalState: true, featureStates: ['kibana'] },
});
const POLICY_WITHOUT_GLOBAL_STATE = getPolicy({
  name: 'without_state',
  retention: { minCount: 1 },
  config: {},
});

describe('<PolicyList />', () => {
  let testBed: PoliciesListTestBed;
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  beforeEach(async () => {
    httpRequestsMockHelpers.setLoadPoliciesResponse({
      policies: [POLICY_WITH_GLOBAL_STATE, POLICY_WITHOUT_GLOBAL_STATE],
    });
    httpRequestsMockHelpers.setGetPolicyResponse(POLICY_WITH_GLOBAL_STATE.name, {
      policy: POLICY_WITH_GLOBAL_STATE,
    });

    testBed = await setupPoliciesListPage(httpSetup);

    await act(async () => {
      await nextTick();
    });

    testBed.component.update();
  });

  describe('details flyout', () => {
    test('should show the detail flyout when clicking on a policy', async () => {
      const { exists, actions } = testBed;

      expect(exists('policyDetail')).toBe(false);

      await actions.clickPolicyAt(0);

      expect(exists('policyDetail')).toBe(true);
    });

    test('should show feature states if include global state is enabled', async () => {
      const { find, exists, actions } = testBed;

      // Assert against first resutl shown in the table, which should have includeGlobalState enabled
      await actions.clickPolicyAt(0);

      expect(exists('featureStates')).toBe(true);
      expect(find('featureStates.value').text()).toBe('kibana');

      // Close the flyout
      find('srPolicyDetailsFlyoutCloseButton').simulate('click');

      // Replace the get policy details api call with the payload of the second row which we're about to click
      httpRequestsMockHelpers.setGetPolicyResponse(POLICY_WITHOUT_GLOBAL_STATE.name, {
        policy: POLICY_WITHOUT_GLOBAL_STATE,
      });

      // Now we will assert against the second result of the table which shouldnt have includeGlobalState
      await actions.clickPolicyAt(1);

      expect(exists('featureStates')).toBe(false);
    });
  });
});
