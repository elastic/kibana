/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';

import { setupEnvironment, pageHelpers, nextTick } from './helpers';
import { PolicyForm } from '../../public/application/components/policy_form';
import { PolicyFormTestBed } from './helpers/policy_form.helpers';
import { POLICY_EDIT } from './helpers/constant';
import { TIME_UNITS } from '../../common/constants';

const { setup } = pageHelpers.policyEdit;
const { setup: setupPolicyAdd } = pageHelpers.policyAdd;

const EXPIRE_AFTER_VALUE = '5';
const EXPIRE_AFTER_UNIT = TIME_UNITS.MINUTE;

jest.mock('ui/i18n', () => {
  const I18nContext = ({ children }: any) => children;
  return { I18nContext };
});

describe('<PolicyEdit />', () => {
  let testBed: PolicyFormTestBed;
  let testBedPolicyAdd: PolicyFormTestBed;
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  afterAll(() => {
    server.restore();
  });

  describe('on component mount', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setGetPolicyResponse({ policy: POLICY_EDIT });
      httpRequestsMockHelpers.setLoadIndicesResponse({
        indices: ['my_index'],
        dataStreams: ['my_data_stream'],
      });
      httpRequestsMockHelpers.setLoadRepositoriesResponse({
        repositories: [{ name: POLICY_EDIT.repository }],
      });

      testBed = await setup();

      await act(async () => {
        await nextTick();
        testBed.component.update();
      });
    });

    test('should set the correct page title', () => {
      const { exists, find } = testBed;
      expect(exists('pageTitle')).toBe(true);
      expect(find('pageTitle').text()).toEqual('Edit policy');
    });

    /**
     * As the "edit" policy component uses the same form underneath that
     * the "create" policy, we won't test it again but simply make sure that
     * the same form component is indeed shared between the 2 app sections.
     */
    test('should use the same Form component as the "<PolicyAdd />" section', async () => {
      testBedPolicyAdd = await setupPolicyAdd();

      await act(async () => {
        await nextTick();
        testBedPolicyAdd.component.update();
      });

      const formEdit = testBed.component.find(PolicyForm);
      const formAdd = testBedPolicyAdd.component.find(PolicyForm);

      expect(formEdit.length).toBe(1);
      expect(formAdd.length).toBe(1);
    });

    test('should disable the policy name field', () => {
      const { find } = testBed;

      const nameInput = find('nameInput');
      expect(nameInput.props().disabled).toEqual(true);
    });

    describe('form payload', () => {
      it('should send the correct payload with changed values', async () => {
        const { form, actions } = testBed;

        const { snapshotName } = POLICY_EDIT;

        // Complete step 1, change snapshot name
        form.setInputValue('snapshotNameInput', `${snapshotName}-edited`);
        actions.clickNextButton();

        // Complete step 2, enable ignore unavailable indices switch
        form.toggleEuiSwitch('ignoreUnavailableIndicesToggle');
        actions.clickNextButton();

        // Complete step 3, modify retention
        form.setInputValue('expireAfterValueInput', EXPIRE_AFTER_VALUE);
        form.setInputValue('expireAfterUnitSelect', EXPIRE_AFTER_UNIT);
        actions.clickNextButton();

        await act(async () => {
          actions.clickSubmitButton();
          await nextTick();
        });

        const latestRequest = server.requests[server.requests.length - 1];

        const expected = {
          ...POLICY_EDIT,
          ...{
            config: {
              ignoreUnavailable: true,
            },
            retention: {
              ...POLICY_EDIT.retention,
              expireAfterValue: Number(EXPIRE_AFTER_VALUE),
              expireAfterUnit: EXPIRE_AFTER_UNIT,
            },
            snapshotName: `${POLICY_EDIT.snapshotName}-edited`,
          },
        };
        expect(JSON.parse(JSON.parse(latestRequest.requestBody).body)).toEqual(expected);
      });

      it('should provide a default time unit value for retention', async () => {
        const { form, actions } = testBed;

        // Bypass step 1
        actions.clickNextButton();

        // Bypass step 2
        actions.clickNextButton();

        // Step 3: Add expire after value, but do not change unit
        form.setInputValue('expireAfterValueInput', EXPIRE_AFTER_VALUE);
        actions.clickNextButton();

        await act(async () => {
          actions.clickSubmitButton();
          await nextTick();
        });

        const latestRequest = server.requests[server.requests.length - 1];

        const expected = {
          ...POLICY_EDIT,
          retention: {
            ...POLICY_EDIT.retention,
            expireAfterValue: Number(EXPIRE_AFTER_VALUE),
            expireAfterUnit: TIME_UNITS.DAY, // default value
          },
        };
        expect(JSON.parse(JSON.parse(latestRequest.requestBody).body)).toEqual(expected);
      });
    });
  });
});
