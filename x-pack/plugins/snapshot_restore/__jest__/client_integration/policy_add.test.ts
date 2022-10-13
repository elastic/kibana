/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import helpers first, this also sets up the mocks
import { setupEnvironment, pageHelpers, getRandomString } from './helpers';

import { ReactElement } from 'react';
import { act } from 'react-dom/test-utils';

import { HttpFetchOptionsWithPath } from '@kbn/core/public';
import * as fixtures from '../../test/fixtures';
import { API_BASE_PATH } from '../../common';

import { PolicyFormTestBed } from './helpers/policy_form.helpers';
import { DEFAULT_POLICY_SCHEDULE } from '../../public/application/constants';
import { FEATURE_STATES_NONE_OPTION } from '../../common/constants';

const { setup } = pageHelpers.policyAdd;

// mock for EuiSelectable's virtualization
jest.mock('react-virtualized-auto-sizer', () => {
  return ({
    children,
  }: {
    children: (dimensions: { width: number; height: number }) => ReactElement;
  }) => children({ width: 100, height: 500 });
});

const POLICY_NAME = 'my_policy';
const SNAPSHOT_NAME = 'my_snapshot';
const MIN_COUNT = '5';
const MAX_COUNT = '10';
const EXPIRE_AFTER_VALUE = '30';
const repository = fixtures.getRepository({ name: `a${getRandomString()}`, type: 'fs' });

describe('<PolicyAdd />', () => {
  let testBed: PolicyFormTestBed;
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  describe('on component mount', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRepositoriesResponse({ repositories: [repository] });
      httpRequestsMockHelpers.setLoadIndicesResponse({
        indices: ['my_index'],
        dataStreams: ['my_data_stream', 'my_other_data_stream'],
      });
      httpRequestsMockHelpers.setLoadFeaturesResponse({
        features: [{ name: 'kibana' }, { name: 'tasks' }],
      });

      testBed = await setup(httpSetup);
      testBed.component.update();
    });

    test('should set the correct page title', () => {
      const { exists, find } = testBed;
      expect(exists('pageTitle')).toBe(true);
      expect(find('pageTitle').text()).toEqual('Create policy');
    });

    test('should not let the user go to the next step if required fields are missing', () => {
      const { find } = testBed;

      expect(find('nextButton').props().disabled).toBe(true);
    });

    test('should not show repository-not-found warning', () => {
      const { exists } = testBed;
      expect(exists('repositoryNotFoundWarning')).toBe(false);
    });

    describe('form validation', () => {
      describe('logistics (step 1)', () => {
        test('should require a policy name', async () => {
          const { form, find } = testBed;

          // Verify required validation
          form.setInputValue('nameInput', '');
          find('nameInput').simulate('blur');
          expect(form.getErrorsMessages()).toEqual(['Policy name is required.']);

          // Enter valid policy name and verify no error messages
          form.setInputValue('nameInput', 'my_policy');
          find('nameInput').simulate('blur');

          expect(form.getErrorsMessages()).toEqual([]);
        });

        test('should require a snapshot name that is lowercase', () => {
          const { form, find } = testBed;

          // Verify required validation
          form.setInputValue('snapshotNameInput', '');
          find('snapshotNameInput').simulate('blur');
          expect(form.getErrorsMessages()).toEqual(['Snapshot name is required.']);

          // Verify lowercase validation
          form.setInputValue('snapshotNameInput', 'MY_SNAPSHOT');
          find('snapshotNameInput').simulate('blur');
          expect(form.getErrorsMessages()).toEqual(['Snapshot name needs to be lowercase.']);

          // Enter valid snapshot name and verify no error messages
          form.setInputValue('snapshotNameInput', 'my_snapshot');
          find('snapshotNameInput').simulate('blur');

          expect(form.getErrorsMessages()).toEqual([]);
        });

        it('should require a schedule', () => {
          const { form, find } = testBed;

          // Verify required validation
          find('showAdvancedCronLink').simulate('click');
          form.setInputValue('advancedCronInput', '');
          find('advancedCronInput').simulate('blur');
          expect(form.getErrorsMessages()).toEqual(['Schedule is required.']);

          // Enter valid schedule and verify no error messages
          form.setInputValue('advancedCronInput', '0 30 1 * * ?');
          find('advancedCronInput').simulate('blur');
          expect(form.getErrorsMessages()).toEqual([]);
        });
      });

      describe('snapshot settings (step 2)', () => {
        beforeEach(() => {
          const { form, actions } = testBed;
          // Complete step 1
          form.setInputValue('nameInput', POLICY_NAME);
          form.setInputValue('snapshotNameInput', SNAPSHOT_NAME);
          actions.clickNextButton();
        });

        test('should require at least one index if no data streams are provided', async () => {
          const { find, form, component } = testBed;

          await act(async () => {
            // Toggle "All indices" switch
            form.toggleEuiSwitch('allIndicesToggle');
          });
          component.update();

          // Deselect all indices from list
          find('deselectIndicesLink').simulate('click');

          expect(form.getErrorsMessages()).toEqual([
            'You must select at least one data stream or index.',
          ]);
        });

        test('should correctly indicate data streams with a badge', async () => {
          const { find, component, form } = testBed;

          await act(async () => {
            // Toggle "All indices" switch
            form.toggleEuiSwitch('allIndicesToggle');
          });
          component.update();

          expect(find('dataStreamBadge').length).toBe(2);
        });
      });

      describe('retention (step 3)', () => {
        beforeEach(() => {
          const { form, actions } = testBed;
          // Complete step 1
          form.setInputValue('nameInput', POLICY_NAME);
          form.setInputValue('snapshotNameInput', SNAPSHOT_NAME);
          actions.clickNextButton();

          // Complete step 2
          actions.clickNextButton();
        });

        test('should not allow the minimum count be greater than the maximum count', () => {
          const { find, form } = testBed;

          form.setInputValue('minCountInput', MAX_COUNT + 1);
          find('minCountInput').simulate('blur');

          form.setInputValue('maxCountInput', MAX_COUNT);
          find('maxCountInput').simulate('blur');

          expect(form.getErrorsMessages()).toEqual([
            'Minimum count cannot be greater than maximum count.',
          ]);
        });

        test('should not allow negative values for the delete after, minimum and maximum counts', () => {
          const { find, form } = testBed;

          form.setInputValue('expireAfterValueInput', '-1');
          find('expireAfterValueInput').simulate('blur');

          form.setInputValue('minCountInput', '-1');
          find('minCountInput').simulate('blur');

          form.setInputValue('maxCountInput', '-1');
          find('maxCountInput').simulate('blur');

          expect(form.getErrorsMessages()).toEqual([
            'Delete after cannot be negative.',
            'Minimum count cannot be negative.',
            'Maximum count cannot be negative.',
          ]);
        });
      });
    });

    describe('feature states', () => {
      beforeEach(async () => {
        const { actions, form, component } = testBed;

        // Complete step 1
        form.setInputValue('nameInput', POLICY_NAME);
        form.setInputValue('snapshotNameInput', SNAPSHOT_NAME);
        actions.clickNextButton();

        component.update();
      });

      test('Enabling include global state enables include feature state', async () => {
        const { find, component, form } = testBed;

        // By default includeGlobalState is enabled, so we need to toogle twice
        await act(async () => {
          form.toggleEuiSwitch('globalStateToggle');
          form.toggleEuiSwitch('globalStateToggle');
        });
        component.update();

        expect(find('featureStatesToggle').props().disabled).toBeUndefined();
      });

      test('feature states dropdown is only shown when include feature states is enabled', async () => {
        const { exists, component, form } = testBed;

        // By default the toggle is enabled
        expect(exists('featureStatesDropdown')).toBe(true);

        await act(async () => {
          form.toggleEuiSwitch('featureStatesToggle');
        });
        component.update();

        expect(exists('featureStatesDropdown')).toBe(false);
      });

      test('include all features by default', async () => {
        const { actions } = testBed;

        // Complete step 2
        actions.clickNextButton();
        // Complete step 3
        actions.clickNextButton();

        await act(async () => {
          actions.clickSubmitButton();
        });

        const lastReq: HttpFetchOptionsWithPath[] = httpSetup.post.mock.calls.pop() || [];
        const [requestUrl, requestBody] = lastReq;
        const parsedReqBody = JSON.parse((requestBody as Record<string, any>).body);

        expect(requestUrl).toBe(`${API_BASE_PATH}policies`);
        expect(parsedReqBody.config).toEqual({
          includeGlobalState: true,
          featureStates: [],
        });
      });

      test('include some features', async () => {
        const { actions, form } = testBed;

        form.setComboBoxValue('featureStatesDropdown', 'kibana');

        // Complete step 2
        actions.clickNextButton();
        // Complete step 3
        actions.clickNextButton();

        await act(async () => {
          actions.clickSubmitButton();
        });

        const lastReq: HttpFetchOptionsWithPath[] = httpSetup.post.mock.calls.pop() || [];
        const [requestUrl, requestBody] = lastReq;
        const parsedReqBody = JSON.parse((requestBody as Record<string, any>).body);

        expect(requestUrl).toBe(`${API_BASE_PATH}policies`);
        expect(parsedReqBody.config).toEqual({
          includeGlobalState: true,
          featureStates: ['kibana'],
        });
      });

      test('include no features', async () => {
        const { actions, form, component } = testBed;

        // Disable all features
        await act(async () => {
          form.toggleEuiSwitch('featureStatesToggle');
        });
        component.update();

        // Complete step 2
        actions.clickNextButton();
        // Complete step 3
        actions.clickNextButton();

        await act(async () => {
          actions.clickSubmitButton();
        });

        const lastReq: HttpFetchOptionsWithPath[] = httpSetup.post.mock.calls.pop() || [];
        const [requestUrl, requestBody] = lastReq;
        const parsedReqBody = JSON.parse((requestBody as Record<string, any>).body);

        expect(requestUrl).toBe(`${API_BASE_PATH}policies`);
        expect(parsedReqBody.config).toEqual({
          includeGlobalState: true,
          featureStates: [FEATURE_STATES_NONE_OPTION],
        });
      });
    });

    describe('form payload & api errors', () => {
      beforeEach(async () => {
        const { actions, form } = testBed;

        // Complete step 1
        form.setInputValue('nameInput', POLICY_NAME);
        form.setInputValue('snapshotNameInput', SNAPSHOT_NAME);
        actions.clickNextButton();

        // Complete step 2
        actions.clickNextButton();

        // Complete step 3
        form.setInputValue('expireAfterValueInput', EXPIRE_AFTER_VALUE);
        form.setInputValue('minCountInput', MIN_COUNT);
        form.setInputValue('maxCountInput', MAX_COUNT);
        actions.clickNextButton();
      });

      it('should send the correct payload', async () => {
        const { actions } = testBed;

        await act(async () => {
          actions.clickSubmitButton();
        });

        expect(httpSetup.post).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}policies`,
          expect.objectContaining({
            body: JSON.stringify({
              name: POLICY_NAME,
              snapshotName: SNAPSHOT_NAME,
              schedule: DEFAULT_POLICY_SCHEDULE,
              repository: repository.name,
              config: { featureStates: [], includeGlobalState: true },
              retention: {
                expireAfterValue: Number(EXPIRE_AFTER_VALUE),
                expireAfterUnit: 'd', // default
                maxCount: Number(MAX_COUNT),
                minCount: Number(MIN_COUNT),
              },
              isManagedPolicy: false,
            }),
          })
        );
      });

      it('should surface the API errors from the put HTTP request', async () => {
        const { component, actions, find, exists } = testBed;

        const error = {
          statusCode: 409,
          error: 'Conflict',
          message: `There is already a policy with name '${POLICY_NAME}'`,
        };

        httpRequestsMockHelpers.setAddPolicyResponse(undefined, error);

        await act(async () => {
          actions.clickSubmitButton();
        });
        component.update();

        expect(exists('savePolicyApiError')).toBe(true);
        expect(find('savePolicyApiError').text()).toContain(error.message);
      });
    });
  });
});
