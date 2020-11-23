/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactElement } from 'react';
import { act } from 'react-dom/test-utils';
import moment from 'moment-timezone';

import { findTestSubject } from '@elastic/eui/lib/test';
import { mountWithIntl } from '@kbn/test/jest';
import { SinonFakeServer } from 'sinon';
import { ReactWrapper } from 'enzyme';
import axios from 'axios';
import axiosXhrAdapter from 'axios/lib/adapters/xhr';
import { createMemoryHistory } from 'history';

import {
  notificationServiceMock,
  fatalErrorsServiceMock,
} from '../../../../../src/core/public/mocks';

import { usageCollectionPluginMock } from '../../../../../src/plugins/usage_collection/public/mocks';

import { CloudSetup } from '../../../cloud/public';

import { EditPolicy } from '../../public/application/sections/edit_policy/edit_policy';
import {
  EditPolicyContextProvider,
  EditPolicyContextValue,
} from '../../public/application/sections/edit_policy/edit_policy_context';

import { KibanaContextProvider } from '../../public/shared_imports';

import { init as initHttp } from '../../public/application/services/http';
import { init as initUiMetric } from '../../public/application/services/ui_metric';
import { init as initNotification } from '../../public/application/services/notification';
import { PolicyFromES } from '../../common/types';

import { i18nTexts } from '../../public/application/sections/edit_policy/i18n_texts';
import { editPolicyHelpers } from './helpers';
import { defaultPolicy } from '../../public/application/constants';

// @ts-ignore
initHttp(axios.create({ adapter: axiosXhrAdapter }));
initUiMetric(usageCollectionPluginMock.createSetupContract());
initNotification(
  notificationServiceMock.createSetupContract().toasts,
  fatalErrorsServiceMock.createSetupContract()
);

const history = createMemoryHistory();
let server: SinonFakeServer;
let httpRequestsMockHelpers: editPolicyHelpers.EditPolicySetup['http']['httpRequestsMockHelpers'];
let http: editPolicyHelpers.EditPolicySetup['http'];
const policy = {
  phases: {
    hot: {
      min_age: '0s',
      actions: {
        rollover: {
          max_size: '1gb',
        },
      },
    },
  },
};
const policies: PolicyFromES[] = [];
for (let i = 0; i < 105; i++) {
  policies.push({
    version: i,
    modified_date: moment().subtract(i, 'days').toISOString(),
    linkedIndices: i % 2 === 0 ? [`index${i}`] : undefined,
    name: `testy${i}`,
    policy: {
      ...policy,
      name: `testy${i}`,
    },
  });
}
window.scrollTo = jest.fn();

let component: ReactElement;
const activatePhase = async (rendered: ReactWrapper, phase: string) => {
  const testSubject = `enablePhaseSwitch-${phase}`;
  await act(async () => {
    await findTestSubject(rendered, testSubject).simulate('click');
  });
  rendered.update();
};
const openNodeAttributesSection = async (rendered: ReactWrapper, phase: string) => {
  const getControls = () => findTestSubject(rendered, `${phase}-dataTierAllocationControls`);
  await act(async () => {
    findTestSubject(getControls(), 'dataTierSelect').simulate('click');
  });
  rendered.update();
  await act(async () => {
    findTestSubject(getControls(), 'customDataAllocationOption').simulate('click');
  });
  rendered.update();
};
const expectedErrorMessages = (rendered: ReactWrapper, expectedMessages: string[]) => {
  const errorMessages = rendered.find('.euiFormErrorText');
  expect(errorMessages.length).toBe(expectedMessages.length);
  expectedMessages.forEach((expectedErrorMessage) => {
    let foundErrorMessage;
    for (let i = 0; i < errorMessages.length; i++) {
      if (errorMessages.at(i).text() === expectedErrorMessage) {
        foundErrorMessage = true;
      }
    }
    expect(foundErrorMessage).toBe(true);
  });
};
const noRollover = async (rendered: ReactWrapper) => {
  await act(async () => {
    findTestSubject(rendered, 'rolloverSwitch').simulate('click');
  });
  rendered.update();
};
const getNodeAttributeSelect = (rendered: ReactWrapper, phase: string) => {
  return findTestSubject(rendered, `${phase}-selectedNodeAttrs`);
};
const setPolicyName = async (rendered: ReactWrapper, policyName: string) => {
  const policyNameField = findTestSubject(rendered, 'policyNameField');
  await act(async () => {
    policyNameField.simulate('change', { target: { value: policyName } });
  });
  rendered.update();
};
const setPhaseAfter = async (rendered: ReactWrapper, phase: string, after: string | number) => {
  const afterInput = findTestSubject(rendered, `${phase}-selectedMinimumAge`);
  await act(async () => {
    afterInput.simulate('change', { target: { value: after } });
  });
  rendered.update();
};
const setPhaseIndexPriority = async (
  rendered: ReactWrapper,
  phase: string,
  priority: string | number
) => {
  const priorityInput = findTestSubject(rendered, `${phase}-phaseIndexPriority`);
  await act(async () => {
    priorityInput.simulate('change', { target: { value: priority } });
  });
  rendered.update();
};
const save = async (rendered: ReactWrapper) => {
  const saveButton = findTestSubject(rendered, 'savePolicyButton');
  await act(async () => {
    saveButton.simulate('click');
  });
  rendered.update();
};

const MyComponent = ({
  isCloudEnabled,
  isNewPolicy,
  policy: _policy,
  existingPolicies,
  getUrlForApp,
  policyName,
}: EditPolicyContextValue & { isCloudEnabled: boolean }) => {
  return (
    <KibanaContextProvider services={{ cloud: { isCloudEnabled } as CloudSetup }}>
      <EditPolicyContextProvider
        value={{
          isNewPolicy,
          policy: _policy,
          existingPolicies,
          policyName,
          getUrlForApp,
        }}
      >
        <EditPolicy history={history} />
      </EditPolicyContextProvider>
    </KibanaContextProvider>
  );
};

describe('edit policy', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  /**
   * The form lib has a short delay (setTimeout) before running and rendering
   * any validation errors. This helper advances timers and can trigger component
   * state changes.
   */
  const waitForFormLibValidation = (rendered: ReactWrapper) => {
    act(() => {
      jest.runAllTimers();
    });
    rendered.update();
  };

  beforeEach(() => {
    component = (
      <MyComponent
        isNewPolicy={true}
        policy={defaultPolicy}
        existingPolicies={policies}
        getUrlForApp={jest.fn()}
        policyName="test"
        isCloudEnabled={false}
      />
    );

    ({ http } = editPolicyHelpers.setup());
    ({ server, httpRequestsMockHelpers } = http);

    httpRequestsMockHelpers.setPoliciesResponse(policies);
  });
  describe('top level form', () => {
    test('should show error when trying to save empty form', async () => {
      const rendered = mountWithIntl(component);
      await save(rendered);
      expectedErrorMessages(rendered, [i18nTexts.editPolicy.errors.policyNameRequiredMessage]);
    });
    test('should show error when trying to save policy name with space', async () => {
      const rendered = mountWithIntl(component);
      await noRollover(rendered);
      await setPolicyName(rendered, 'my policy');
      waitForFormLibValidation(rendered);
      expectedErrorMessages(rendered, [i18nTexts.editPolicy.errors.policyNameContainsInvalidChars]);
    });
    test('should show error when trying to save policy name that is already used', async () => {
      const rendered = mountWithIntl(component);
      await noRollover(rendered);
      await setPolicyName(rendered, 'testy0');
      waitForFormLibValidation(rendered);
      expectedErrorMessages(rendered, [
        i18nTexts.editPolicy.errors.policyNameAlreadyUsedErrorMessage,
      ]);
    });
    test('should show error when trying to save as new policy but using the same name', async () => {
      component = (
        <MyComponent
          isNewPolicy={false}
          policy={defaultPolicy}
          existingPolicies={policies}
          getUrlForApp={jest.fn()}
          isCloudEnabled={false}
        />
      );
      const rendered = mountWithIntl(component);
      findTestSubject(rendered, 'saveAsNewSwitch').simulate('click');
      rendered.update();
      await setPolicyName(rendered, 'testy0');
      waitForFormLibValidation(rendered);
      expectedErrorMessages(rendered, [
        i18nTexts.editPolicy.errors.policyNameAlreadyUsedErrorMessage,
      ]);
    });
    test('should show error when trying to save policy name with comma', async () => {
      const rendered = mountWithIntl(component);
      await noRollover(rendered);
      await setPolicyName(rendered, 'my,policy');
      waitForFormLibValidation(rendered);
      expectedErrorMessages(rendered, [i18nTexts.editPolicy.errors.policyNameContainsInvalidChars]);
    });
    test('should show error when trying to save policy name starting with underscore', async () => {
      const rendered = mountWithIntl(component);
      await noRollover(rendered);
      await setPolicyName(rendered, '_mypolicy');
      waitForFormLibValidation(rendered);
      expectedErrorMessages(rendered, [
        i18nTexts.editPolicy.errors.policyNameStartsWithUnderscoreErrorMessage,
      ]);
    });
    test('should show correct json in policy flyout', async () => {
      const rendered = mountWithIntl(
        <MyComponent
          policyName="my-policy"
          isNewPolicy={false}
          policy={defaultPolicy}
          existingPolicies={policies}
          getUrlForApp={jest.fn()}
          isCloudEnabled={false}
        />
      );

      await act(async () => {
        findTestSubject(rendered, 'requestButton').simulate('click');
      });
      rendered.update();

      const json = rendered.find(`code`).text();
      const expected = `PUT _ilm/policy/my-policy\n${JSON.stringify(
        {
          policy: {
            phases: {
              hot: {
                actions: {
                  rollover: {
                    max_age: '30d',
                    max_size: '50gb',
                  },
                  set_priority: {
                    priority: 100,
                  },
                },
                min_age: '0ms',
              },
            },
          },
        },
        null,
        2
      )}`;
      expect(json).toBe(expected);
    });
  });
  describe('hot phase', () => {
    test('should show errors when trying to save with no max size and no max age', async () => {
      const rendered = mountWithIntl(component);
      expect(findTestSubject(rendered, 'rolloverSettingsRequired').exists()).toBeFalsy();
      await setPolicyName(rendered, 'mypolicy');
      const maxSizeInput = findTestSubject(rendered, 'hot-selectedMaxSizeStored');
      await act(async () => {
        maxSizeInput.simulate('change', { target: { value: '' } });
      });
      waitForFormLibValidation(rendered);
      const maxAgeInput = findTestSubject(rendered, 'hot-selectedMaxAge');
      await act(async () => {
        maxAgeInput.simulate('change', { target: { value: '' } });
      });
      waitForFormLibValidation(rendered);
      await save(rendered);
      expect(findTestSubject(rendered, 'rolloverSettingsRequired').exists()).toBeTruthy();
    });
    test('should show number above 0 required error when trying to save with -1 for max size', async () => {
      const rendered = mountWithIntl(component);
      await setPolicyName(rendered, 'mypolicy');
      const maxSizeInput = findTestSubject(rendered, 'hot-selectedMaxSizeStored');
      await act(async () => {
        maxSizeInput.simulate('change', { target: { value: '-1' } });
      });
      waitForFormLibValidation(rendered);
      rendered.update();
      expectedErrorMessages(rendered, [i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
    test('should show number above 0 required error when trying to save with 0 for max size', async () => {
      const rendered = mountWithIntl(component);
      await setPolicyName(rendered, 'mypolicy');
      const maxSizeInput = findTestSubject(rendered, 'hot-selectedMaxSizeStored');
      await act(async () => {
        maxSizeInput.simulate('change', { target: { value: '-1' } });
      });
      waitForFormLibValidation(rendered);
      expectedErrorMessages(rendered, [i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
    test('should show number above 0 required error when trying to save with -1 for max age', async () => {
      const rendered = mountWithIntl(component);
      await setPolicyName(rendered, 'mypolicy');
      const maxAgeInput = findTestSubject(rendered, 'hot-selectedMaxAge');
      await act(async () => {
        maxAgeInput.simulate('change', { target: { value: '-1' } });
      });
      waitForFormLibValidation(rendered);
      expectedErrorMessages(rendered, [i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
    test('should show number above 0 required error when trying to save with 0 for max age', async () => {
      const rendered = mountWithIntl(component);
      await setPolicyName(rendered, 'mypolicy');
      const maxAgeInput = findTestSubject(rendered, 'hot-selectedMaxAge');
      await act(async () => {
        maxAgeInput.simulate('change', { target: { value: '0' } });
      });
      waitForFormLibValidation(rendered);
      expectedErrorMessages(rendered, [i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
    test('should show forcemerge input when rollover enabled', async () => {
      const rendered = mountWithIntl(component);
      await setPolicyName(rendered, 'mypolicy');
      expect(findTestSubject(rendered, 'hot-forceMergeSwitch').exists()).toBeTruthy();
    });
    test('should hide forcemerge input when rollover is disabled', async () => {
      const rendered = mountWithIntl(component);
      await setPolicyName(rendered, 'mypolicy');
      await noRollover(rendered);
      waitForFormLibValidation(rendered);
      expect(findTestSubject(rendered, 'hot-forceMergeSwitch').exists()).toBeFalsy();
    });
    test('should show positive number required above zero error when trying to save hot phase with 0 for force merge', async () => {
      const rendered = mountWithIntl(component);
      await setPolicyName(rendered, 'mypolicy');
      act(() => {
        findTestSubject(rendered, 'hot-forceMergeSwitch').simulate('click');
      });
      rendered.update();
      const forcemergeInput = findTestSubject(rendered, 'hot-selectedForceMergeSegments');
      await act(async () => {
        forcemergeInput.simulate('change', { target: { value: '0' } });
      });
      waitForFormLibValidation(rendered);
      expectedErrorMessages(rendered, [i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
    test('should show positive number above 0 required error when trying to save hot phase with -1 for force merge', async () => {
      const rendered = mountWithIntl(component);
      await setPolicyName(rendered, 'mypolicy');
      findTestSubject(rendered, 'hot-forceMergeSwitch').simulate('click');
      rendered.update();
      const forcemergeInput = findTestSubject(rendered, 'hot-selectedForceMergeSegments');
      await act(async () => {
        forcemergeInput.simulate('change', { target: { value: '-1' } });
      });
      waitForFormLibValidation(rendered);
      await save(rendered);
      expectedErrorMessages(rendered, [i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
    test('should show positive number required error when trying to save with -1 for index priority', async () => {
      const rendered = mountWithIntl(component);
      await noRollover(rendered);
      await setPolicyName(rendered, 'mypolicy');
      await setPhaseIndexPriority(rendered, 'hot', '-1');
      waitForFormLibValidation(rendered);
      expectedErrorMessages(rendered, [i18nTexts.editPolicy.errors.nonNegativeNumberRequired]);
    });
  });
  describe('warm phase', () => {
    beforeEach(() => {
      server.respondImmediately = true;
      http.setupNodeListResponse();
      httpRequestsMockHelpers.setNodesDetailsResponse('attribute:true', [
        { nodeId: 'testNodeId', stats: { name: 'testNodeName', host: 'testHost' } },
      ]);
    });

    test('should show number required error when trying to save empty warm phase', async () => {
      const rendered = mountWithIntl(component);
      await noRollover(rendered);
      await setPolicyName(rendered, 'mypolicy');
      await activatePhase(rendered, 'warm');
      await setPhaseAfter(rendered, 'warm', '');
      waitForFormLibValidation(rendered);
      expectedErrorMessages(rendered, [i18nTexts.editPolicy.errors.nonNegativeNumberRequired]);
    });
    test('should allow 0 for phase timing', async () => {
      const rendered = mountWithIntl(component);
      await noRollover(rendered);
      await setPolicyName(rendered, 'mypolicy');
      await activatePhase(rendered, 'warm');
      await setPhaseAfter(rendered, 'warm', '0');
      waitForFormLibValidation(rendered);
      expectedErrorMessages(rendered, []);
    });
    test('should show positive number required error when trying to save warm phase with -1 for after', async () => {
      const rendered = mountWithIntl(component);
      await noRollover(rendered);
      await setPolicyName(rendered, 'mypolicy');
      await activatePhase(rendered, 'warm');
      await setPhaseAfter(rendered, 'warm', '-1');
      waitForFormLibValidation(rendered);
      expectedErrorMessages(rendered, [i18nTexts.editPolicy.errors.nonNegativeNumberRequired]);
    });
    test('should show positive number required error when trying to save warm phase with -1 for index priority', async () => {
      const rendered = mountWithIntl(component);
      await noRollover(rendered);
      await setPolicyName(rendered, 'mypolicy');
      await activatePhase(rendered, 'warm');
      await setPhaseAfter(rendered, 'warm', '1');
      await setPhaseAfter(rendered, 'warm', '-1');
      waitForFormLibValidation(rendered);
      expectedErrorMessages(rendered, [i18nTexts.editPolicy.errors.nonNegativeNumberRequired]);
    });
    test('should show positive number required above zero error when trying to save warm phase with 0 for shrink', async () => {
      const rendered = mountWithIntl(component);
      await noRollover(rendered);
      await setPolicyName(rendered, 'mypolicy');
      await activatePhase(rendered, 'warm');
      act(() => {
        findTestSubject(rendered, 'warm-shrinkSwitch').simulate('click');
      });
      rendered.update();
      await setPhaseAfter(rendered, 'warm', '1');
      const shrinkInput = findTestSubject(rendered, 'warm-selectedPrimaryShardCount');
      await act(async () => {
        shrinkInput.simulate('change', { target: { value: '0' } });
      });
      waitForFormLibValidation(rendered);
      expectedErrorMessages(rendered, [i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
    test('should show positive number above 0 required error when trying to save warm phase with -1 for shrink', async () => {
      const rendered = mountWithIntl(component);
      await noRollover(rendered);
      await setPolicyName(rendered, 'mypolicy');
      await activatePhase(rendered, 'warm');
      await setPhaseAfter(rendered, 'warm', '1');
      act(() => {
        findTestSubject(rendered, 'warm-shrinkSwitch').simulate('click');
      });
      rendered.update();
      const shrinkInput = findTestSubject(rendered, 'warm-selectedPrimaryShardCount');
      await act(async () => {
        shrinkInput.simulate('change', { target: { value: '-1' } });
      });
      waitForFormLibValidation(rendered);
      expectedErrorMessages(rendered, [i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
    test('should show positive number required above zero error when trying to save warm phase with 0 for force merge', async () => {
      const rendered = mountWithIntl(component);
      await noRollover(rendered);
      await setPolicyName(rendered, 'mypolicy');
      await activatePhase(rendered, 'warm');
      await setPhaseAfter(rendered, 'warm', '1');
      act(() => {
        findTestSubject(rendered, 'warm-forceMergeSwitch').simulate('click');
      });
      rendered.update();
      const forcemergeInput = findTestSubject(rendered, 'warm-selectedForceMergeSegments');
      await act(async () => {
        forcemergeInput.simulate('change', { target: { value: '0' } });
      });
      waitForFormLibValidation(rendered);
      expectedErrorMessages(rendered, [i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
    test('should show positive number above 0 required error when trying to save warm phase with -1 for force merge', async () => {
      const rendered = mountWithIntl(component);
      await noRollover(rendered);
      await setPolicyName(rendered, 'mypolicy');
      await activatePhase(rendered, 'warm');
      await setPhaseAfter(rendered, 'warm', '1');
      await act(async () => {
        findTestSubject(rendered, 'warm-forceMergeSwitch').simulate('click');
      });
      rendered.update();
      const forcemergeInput = findTestSubject(rendered, 'warm-selectedForceMergeSegments');
      await act(async () => {
        forcemergeInput.simulate('change', { target: { value: '-1' } });
      });
      waitForFormLibValidation(rendered);
      expectedErrorMessages(rendered, [i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
    test('should show spinner for node attributes input when loading', async () => {
      server.respondImmediately = false;
      const rendered = mountWithIntl(component);
      await noRollover(rendered);
      await setPolicyName(rendered, 'mypolicy');
      await activatePhase(rendered, 'warm');
      expect(rendered.find('.euiLoadingSpinner').exists()).toBeTruthy();
      expect(rendered.find('.euiCallOut--warning').exists()).toBeFalsy();
      expect(getNodeAttributeSelect(rendered, 'warm').exists()).toBeFalsy();
    });
    test('should show warning instead of node attributes input when none exist', async () => {
      http.setupNodeListResponse({
        nodesByAttributes: {},
        nodesByRoles: { data: ['node1'] },
        isUsingDeprecatedDataRoleConfig: false,
      });
      const rendered = mountWithIntl(component);
      await noRollover(rendered);
      await setPolicyName(rendered, 'mypolicy');
      await activatePhase(rendered, 'warm');
      expect(rendered.find('.euiLoadingSpinner').exists()).toBeFalsy();
      await openNodeAttributesSection(rendered, 'warm');
      expect(findTestSubject(rendered, 'noNodeAttributesWarning').exists()).toBeTruthy();
      expect(getNodeAttributeSelect(rendered, 'warm').exists()).toBeFalsy();
    });
    test('should show node attributes input when attributes exist', async () => {
      const rendered = mountWithIntl(component);
      await noRollover(rendered);
      await setPolicyName(rendered, 'mypolicy');
      await activatePhase(rendered, 'warm');
      expect(rendered.find('.euiLoadingSpinner').exists()).toBeFalsy();
      await openNodeAttributesSection(rendered, 'warm');
      expect(findTestSubject(rendered, 'noNodeAttributesWarning').exists()).toBeFalsy();
      const nodeAttributesSelect = getNodeAttributeSelect(rendered, 'warm');
      expect(nodeAttributesSelect.exists()).toBeTruthy();
      expect(nodeAttributesSelect.find('option').length).toBe(2);
    });
    test('should show view node attributes link when attribute selected and show flyout when clicked', async () => {
      const rendered = mountWithIntl(component);
      await noRollover(rendered);
      await setPolicyName(rendered, 'mypolicy');
      await activatePhase(rendered, 'warm');
      expect(rendered.find('.euiLoadingSpinner').exists()).toBeFalsy();
      await openNodeAttributesSection(rendered, 'warm');
      expect(findTestSubject(rendered, 'noNodeAttributesWarning').exists()).toBeFalsy();
      const nodeAttributesSelect = getNodeAttributeSelect(rendered, 'warm');
      expect(nodeAttributesSelect.exists()).toBeTruthy();
      expect(findTestSubject(rendered, 'warm-viewNodeDetailsFlyoutButton').exists()).toBeFalsy();
      expect(nodeAttributesSelect.find('option').length).toBe(2);
      await act(async () => {
        nodeAttributesSelect.simulate('change', { target: { value: 'attribute:true' } });
      });
      rendered.update();
      const flyoutButton = findTestSubject(rendered, 'warm-viewNodeDetailsFlyoutButton');
      expect(flyoutButton.exists()).toBeTruthy();
      await act(async () => {
        await flyoutButton.simulate('click');
      });
      rendered.update();
      expect(rendered.find('.euiFlyout').exists()).toBeTruthy();
    });
    test('should show default allocation warning when no node roles are found', async () => {
      http.setupNodeListResponse({
        nodesByAttributes: {},
        nodesByRoles: {},
        isUsingDeprecatedDataRoleConfig: false,
      });
      const rendered = mountWithIntl(component);
      await noRollover(rendered);
      await setPolicyName(rendered, 'mypolicy');
      await activatePhase(rendered, 'warm');
      expect(rendered.find('.euiLoadingSpinner').exists()).toBeFalsy();
      expect(findTestSubject(rendered, 'defaultAllocationWarning').exists()).toBeTruthy();
    });
    test('should show default allocation notice when hot tier exists, but not warm tier', async () => {
      http.setupNodeListResponse({
        nodesByAttributes: {},
        nodesByRoles: { data_hot: ['test'], data_cold: ['test'] },
        isUsingDeprecatedDataRoleConfig: false,
      });
      const rendered = mountWithIntl(component);
      await noRollover(rendered);
      await setPolicyName(rendered, 'mypolicy');
      await activatePhase(rendered, 'warm');
      expect(rendered.find('.euiLoadingSpinner').exists()).toBeFalsy();
      expect(findTestSubject(rendered, 'defaultAllocationNotice').exists()).toBeTruthy();
    });
    test('should not show default allocation notice when node with "data" role exists', async () => {
      http.setupNodeListResponse({
        nodesByAttributes: {},
        nodesByRoles: { data: ['test'] },
        isUsingDeprecatedDataRoleConfig: false,
      });
      const rendered = mountWithIntl(component);
      await noRollover(rendered);
      await setPolicyName(rendered, 'mypolicy');
      await activatePhase(rendered, 'warm');
      expect(rendered.find('.euiLoadingSpinner').exists()).toBeFalsy();
      expect(findTestSubject(rendered, 'defaultAllocationNotice').exists()).toBeFalsy();
    });
  });
  describe('cold phase', () => {
    beforeEach(() => {
      server.respondImmediately = true;
      http.setupNodeListResponse();
      httpRequestsMockHelpers.setNodesDetailsResponse('attribute:true', [
        { nodeId: 'testNodeId', stats: { name: 'testNodeName', host: 'testHost' } },
      ]);
    });
    test('should allow 0 for phase timing', async () => {
      const rendered = mountWithIntl(component);
      await noRollover(rendered);
      await setPolicyName(rendered, 'mypolicy');
      await activatePhase(rendered, 'cold');
      await setPhaseAfter(rendered, 'cold', '0');
      waitForFormLibValidation(rendered);
      rendered.update();
      expectedErrorMessages(rendered, []);
    });
    test('should show positive number required error when trying to save cold phase with -1 for after', async () => {
      const rendered = mountWithIntl(component);
      await noRollover(rendered);
      await setPolicyName(rendered, 'mypolicy');
      await activatePhase(rendered, 'cold');
      await setPhaseAfter(rendered, 'cold', '-1');
      waitForFormLibValidation(rendered);
      expectedErrorMessages(rendered, [i18nTexts.editPolicy.errors.nonNegativeNumberRequired]);
    });
    test('should show spinner for node attributes input when loading', async () => {
      server.respondImmediately = false;
      const rendered = mountWithIntl(component);
      await noRollover(rendered);
      await setPolicyName(rendered, 'mypolicy');
      await activatePhase(rendered, 'cold');
      expect(rendered.find('.euiLoadingSpinner').exists()).toBeTruthy();
      expect(rendered.find('.euiCallOut--warning').exists()).toBeFalsy();
      expect(getNodeAttributeSelect(rendered, 'cold').exists()).toBeFalsy();
    });
    test('should show warning instead of node attributes input when none exist', async () => {
      http.setupNodeListResponse({
        nodesByAttributes: {},
        nodesByRoles: { data: ['node1'] },
        isUsingDeprecatedDataRoleConfig: false,
      });
      const rendered = mountWithIntl(component);
      await noRollover(rendered);
      await setPolicyName(rendered, 'mypolicy');
      await activatePhase(rendered, 'cold');
      expect(rendered.find('.euiLoadingSpinner').exists()).toBeFalsy();
      await openNodeAttributesSection(rendered, 'cold');
      expect(findTestSubject(rendered, 'noNodeAttributesWarning').exists()).toBeTruthy();
      expect(getNodeAttributeSelect(rendered, 'cold').exists()).toBeFalsy();
    });
    test('should show node attributes input when attributes exist', async () => {
      const rendered = mountWithIntl(component);
      await noRollover(rendered);
      await setPolicyName(rendered, 'mypolicy');
      await activatePhase(rendered, 'cold');
      expect(rendered.find('.euiLoadingSpinner').exists()).toBeFalsy();
      await openNodeAttributesSection(rendered, 'cold');
      expect(findTestSubject(rendered, 'noNodeAttributesWarning').exists()).toBeFalsy();
      const nodeAttributesSelect = getNodeAttributeSelect(rendered, 'cold');
      expect(nodeAttributesSelect.exists()).toBeTruthy();
      expect(nodeAttributesSelect.find('option').length).toBe(2);
    });
    test('should show view node attributes link when attribute selected and show flyout when clicked', async () => {
      const rendered = mountWithIntl(component);
      await noRollover(rendered);
      await setPolicyName(rendered, 'mypolicy');
      await activatePhase(rendered, 'cold');
      expect(rendered.find('.euiLoadingSpinner').exists()).toBeFalsy();
      await openNodeAttributesSection(rendered, 'cold');
      expect(findTestSubject(rendered, 'noNodeAttributesWarning').exists()).toBeFalsy();
      const nodeAttributesSelect = getNodeAttributeSelect(rendered, 'cold');
      expect(nodeAttributesSelect.exists()).toBeTruthy();
      expect(findTestSubject(rendered, 'cold-viewNodeDetailsFlyoutButton').exists()).toBeFalsy();
      expect(nodeAttributesSelect.find('option').length).toBe(2);
      nodeAttributesSelect.simulate('change', { target: { value: 'attribute:true' } });
      rendered.update();
      const flyoutButton = findTestSubject(rendered, 'cold-viewNodeDetailsFlyoutButton');
      expect(flyoutButton.exists()).toBeTruthy();
      await act(async () => {
        await flyoutButton.simulate('click');
      });
      rendered.update();
      expect(rendered.find('.euiFlyout').exists()).toBeTruthy();
    });
    test('should show positive number required error when trying to save with -1 for index priority', async () => {
      const rendered = mountWithIntl(component);
      await noRollover(rendered);
      await setPolicyName(rendered, 'mypolicy');
      await activatePhase(rendered, 'cold');
      await setPhaseAfter(rendered, 'cold', '1');
      await setPhaseIndexPriority(rendered, 'cold', '-1');
      waitForFormLibValidation(rendered);
      expectedErrorMessages(rendered, [i18nTexts.editPolicy.errors.nonNegativeNumberRequired]);
    });
    test('should show default allocation warning when no node roles are found', async () => {
      http.setupNodeListResponse({
        nodesByAttributes: {},
        nodesByRoles: {},
        isUsingDeprecatedDataRoleConfig: false,
      });
      const rendered = mountWithIntl(component);
      await noRollover(rendered);
      await setPolicyName(rendered, 'mypolicy');
      await activatePhase(rendered, 'cold');
      expect(rendered.find('.euiLoadingSpinner').exists()).toBeFalsy();
      expect(findTestSubject(rendered, 'defaultAllocationWarning').exists()).toBeTruthy();
    });
    test('should show default allocation notice when warm or hot tiers exists, but not cold tier', async () => {
      http.setupNodeListResponse({
        nodesByAttributes: {},
        nodesByRoles: { data_hot: ['test'], data_warm: ['test'] },
        isUsingDeprecatedDataRoleConfig: false,
      });
      const rendered = mountWithIntl(component);
      await noRollover(rendered);
      await setPolicyName(rendered, 'mypolicy');
      await activatePhase(rendered, 'cold');
      expect(rendered.find('.euiLoadingSpinner').exists()).toBeFalsy();
      expect(findTestSubject(rendered, 'defaultAllocationNotice').exists()).toBeTruthy();
    });
    test('should not show default allocation notice when node with "data" role exists', async () => {
      http.setupNodeListResponse({
        nodesByAttributes: {},
        nodesByRoles: { data: ['test'] },
        isUsingDeprecatedDataRoleConfig: false,
      });
      const rendered = mountWithIntl(component);
      await noRollover(rendered);
      await setPolicyName(rendered, 'mypolicy');
      await activatePhase(rendered, 'cold');
      expect(rendered.find('.euiLoadingSpinner').exists()).toBeFalsy();
      expect(findTestSubject(rendered, 'defaultAllocationNotice').exists()).toBeFalsy();
    });
  });
  describe('delete phase', () => {
    test('should allow 0 for phase timing', async () => {
      const rendered = mountWithIntl(component);
      await noRollover(rendered);
      await setPolicyName(rendered, 'mypolicy');
      await activatePhase(rendered, 'delete');
      await setPhaseAfter(rendered, 'delete', '0');
      waitForFormLibValidation(rendered);
      expectedErrorMessages(rendered, []);
    });
    test('should show positive number required error when trying to save delete phase with -1 for after', async () => {
      const rendered = mountWithIntl(component);
      await noRollover(rendered);
      await setPolicyName(rendered, 'mypolicy');
      await activatePhase(rendered, 'delete');
      await setPhaseAfter(rendered, 'delete', '-1');
      waitForFormLibValidation(rendered);
      expectedErrorMessages(rendered, [i18nTexts.editPolicy.errors.nonNegativeNumberRequired]);
    });
  });
  describe('not on cloud', () => {
    beforeEach(() => {
      server.respondImmediately = true;
    });
    test('should show all allocation options, even if using legacy config', async () => {
      http.setupNodeListResponse({
        nodesByAttributes: { test: ['123'] },
        nodesByRoles: { data: ['test'], data_hot: ['test'], data_warm: ['test'] },
        isUsingDeprecatedDataRoleConfig: true,
      });
      const rendered = mountWithIntl(component);
      await noRollover(rendered);
      await setPolicyName(rendered, 'mypolicy');
      await activatePhase(rendered, 'warm');
      expect(rendered.find('.euiLoadingSpinner').exists()).toBeFalsy();

      // Assert that only the custom and off options exist
      findTestSubject(rendered, 'dataTierSelect').simulate('click');
      expect(findTestSubject(rendered, 'defaultDataAllocationOption').exists()).toBeTruthy();
      expect(findTestSubject(rendered, 'customDataAllocationOption').exists()).toBeTruthy();
      expect(findTestSubject(rendered, 'noneDataAllocationOption').exists()).toBeTruthy();
    });
  });
  describe('on cloud', () => {
    beforeEach(() => {
      component = (
        <MyComponent
          isNewPolicy={true}
          policy={defaultPolicy}
          existingPolicies={policies}
          getUrlForApp={jest.fn()}
          isCloudEnabled={true}
        />
      );
      ({ http } = editPolicyHelpers.setup());
      ({ server, httpRequestsMockHelpers } = http);
      server.respondImmediately = true;

      httpRequestsMockHelpers.setPoliciesResponse(policies);
    });

    describe('with deprecated data role config', () => {
      test('should hide data tier option on cloud using legacy node role configuration', async () => {
        http.setupNodeListResponse({
          nodesByAttributes: { test: ['123'] },
          // On cloud, if using legacy config there will not be any "data_*" roles set.
          nodesByRoles: { data: ['test'] },
          isUsingDeprecatedDataRoleConfig: true,
        });
        const rendered = mountWithIntl(component);
        await noRollover(rendered);
        await setPolicyName(rendered, 'mypolicy');
        await activatePhase(rendered, 'warm');
        expect(rendered.find('.euiLoadingSpinner').exists()).toBeFalsy();

        // Assert that only the custom and off options exist
        findTestSubject(rendered, 'dataTierSelect').simulate('click');
        expect(findTestSubject(rendered, 'defaultDataAllocationOption').exists()).toBeFalsy();
        expect(findTestSubject(rendered, 'customDataAllocationOption').exists()).toBeTruthy();
        expect(findTestSubject(rendered, 'noneDataAllocationOption').exists()).toBeTruthy();
      });
    });

    describe('with node role config', () => {
      test('should show off, custom and data role options on cloud with data roles', async () => {
        http.setupNodeListResponse({
          nodesByAttributes: { test: ['123'] },
          nodesByRoles: { data: ['test'], data_hot: ['test'], data_warm: ['test'] },
          isUsingDeprecatedDataRoleConfig: false,
        });
        const rendered = mountWithIntl(component);
        await noRollover(rendered);
        await setPolicyName(rendered, 'mypolicy');
        await activatePhase(rendered, 'warm');
        expect(rendered.find('.euiLoadingSpinner').exists()).toBeFalsy();

        findTestSubject(rendered, 'dataTierSelect').simulate('click');
        expect(findTestSubject(rendered, 'defaultDataAllocationOption').exists()).toBeTruthy();
        expect(findTestSubject(rendered, 'customDataAllocationOption').exists()).toBeTruthy();
        expect(findTestSubject(rendered, 'noneDataAllocationOption').exists()).toBeTruthy();
        // We should not be showing the call-to-action for users to activate data tiers in cloud
        expect(findTestSubject(rendered, 'cloudDataTierCallout').exists()).toBeFalsy();
      });

      test('should show cloud notice when cold tier nodes do not exist', async () => {
        http.setupNodeListResponse({
          nodesByAttributes: {},
          nodesByRoles: { data: ['test'], data_hot: ['test'], data_warm: ['test'] },
          isUsingDeprecatedDataRoleConfig: false,
        });
        const rendered = mountWithIntl(component);
        await noRollover(rendered);
        await setPolicyName(rendered, 'mypolicy');
        await activatePhase(rendered, 'cold');
        expect(rendered.find('.euiLoadingSpinner').exists()).toBeFalsy();
        expect(findTestSubject(rendered, 'cloudDataTierCallout').exists()).toBeTruthy();
        // Assert that other notices are not showing
        expect(findTestSubject(rendered, 'defaultAllocationNotice').exists()).toBeFalsy();
        expect(findTestSubject(rendered, 'noNodeAttributesWarning').exists()).toBeFalsy();
      });
    });
  });
});
