/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment-timezone';
import { Provider } from 'react-redux';
import { fetchedPolicies } from '../../public/store/actions';
import { indexLifecycleManagementStore } from '../../public/store';
import { mountWithIntl } from '../../../../test_utils/enzyme_helpers';
import { EditPolicy } from '../../public/sections/edit_policy';
// axios has a $http like interface so using it to simulate $http
import axios from 'axios';
import { setHttpClient } from '../../public/services/api';
setHttpClient(axios.create());
import sinon from 'sinon';
import { findTestSubject } from '@elastic/eui/lib/test';
import {
  positiveNumbersAboveZeroErrorMessage,
  numberRequiredMessage,
  positiveNumberRequiredMessage,
  maximumAgeRequiredMessage,
  maximumSizeRequiredMessage,
  policyNameRequiredMessage,
  policyNameStartsWithUnderscoreErrorMessage,
  policyNameContainsCommaErrorMessage,
  policyNameContainsSpaceErrorMessage,
  policyNameMustBeDifferentErrorMessage,
  policyNameAlreadyUsedErrorMessage,
} from '../../public/store/selectors/lifecycle';

let server;
let store;
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
const policies = [];
for (let i = 0; i < 105; i++) {
  policies.push({
    version: i,
    modified_date: moment()
      .subtract(i, 'days')
      .valueOf(),
    coveredIndices: i % 2 === 0 ? [`index${i}`] : null,
    name: `testy${i}`,
    policy: {
      ...policy
    },
  });
}
window.scrollTo = jest.fn();
window.TextEncoder = null;
let component;
const activatePhase = (rendered, phase) => {
  const testSubject = `activatePhaseButton-${phase}`;
  findTestSubject(rendered, testSubject).simulate('click');
  rendered.update();
};
const expectedErrorMessages = (rendered, expectedErrorMessages) => {
  expect(rendered.exists('.euiToast'));
  const errorMessages = rendered.find('.euiFormErrorText');
  expectedErrorMessages.forEach(expectedErrorMessage => {
    let foundErrorMessage;
    for (let i = 0; i < errorMessages.length; i++) {
      if (errorMessages.at(i).text() === expectedErrorMessage) {
        foundErrorMessage = true;
      }
    }
    expect(foundErrorMessage).toBe(true);
  });
};
const save = rendered => {
  const saveButton = findTestSubject(rendered, 'savePolicyButton');
  saveButton.simulate('click');
  rendered.update();
};
describe('edit policy', () => {
  beforeEach(() => {
    store = indexLifecycleManagementStore();
    component = (
      <Provider store={store}>
        <EditPolicy />
      </Provider>
    );
    store.dispatch(fetchedPolicies(policies));
    server = sinon.fakeServer.create();
    server.respondWith('/api/index_lifecycle_management/policies', [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify(policies),
    ]);
  });
  test('should show error when trying to save empty form', () => {
    const rendered = mountWithIntl(component);
    save(rendered);
    expectedErrorMessages(rendered, [
      policyNameRequiredMessage,
      maximumSizeRequiredMessage,
      maximumAgeRequiredMessage,
    ]);
  });
  test('should show error when trying to save policy name with space', () => {
    const rendered = mountWithIntl(component);
    const policyNameField = findTestSubject(rendered, 'policyNameField');
    policyNameField.simulate('change', { target: { value: 'my policy' } });
    rendered.update();
    save(rendered);
    expectedErrorMessages(rendered, [policyNameContainsSpaceErrorMessage]);
  });
  test('should show error when trying to save policy name that is already used', () => {
    const rendered = mountWithIntl(component);
    const policyNameField = findTestSubject(rendered, 'policyNameField');
    policyNameField.simulate('change', { target: { value: 'testy0' } });
    rendered.update();
    save(rendered);
    expectedErrorMessages(rendered, [policyNameAlreadyUsedErrorMessage]);
  });
  test('should show error when trying to save as new policy but using the same name', () => {
    component = (
      <Provider store={store}>
        <EditPolicy match={{ params: { policyName: 'testy0' } }} />
      </Provider>
    );
    const rendered = mountWithIntl(component);
    findTestSubject(rendered, 'saveAsNewSwitch').simulate('change', { target: { checked: true } });
    rendered.update();
    const policyNameField = findTestSubject(rendered, 'policyNameField');
    policyNameField.simulate('change', { target: { value: 'testy0' } });
    rendered.update();
    save(rendered);
    expectedErrorMessages(rendered, [policyNameMustBeDifferentErrorMessage]);
  });
  test('should show error when trying to save policy name with comma', () => {
    const rendered = mountWithIntl(component);
    const policyNameField = findTestSubject(rendered, 'policyNameField');
    policyNameField.simulate('change', { target: { value: 'my,policy' } });
    rendered.update();
    save(rendered);
    expectedErrorMessages(rendered, [policyNameContainsCommaErrorMessage]);
  });
  test('should show error when trying to save policy name starting with underscore', () => {
    const rendered = mountWithIntl(component);
    const policyNameField = findTestSubject(rendered, 'policyNameField');
    policyNameField.simulate('change', { target: { value: '_mypolicy' } });
    rendered.update();
    save(rendered);
    expectedErrorMessages(rendered, [policyNameStartsWithUnderscoreErrorMessage]);
  });
  test('should show number required error when trying to save empty warm phase', () => {
    const rendered = mountWithIntl(component);
    activatePhase(rendered, 'warm');
    save(rendered);
    expectedErrorMessages(rendered, [numberRequiredMessage]);
  });
  test('should show positive number required above zero error when trying to save warm phase with 0 for after', () => {
    const rendered = mountWithIntl(component);
    activatePhase(rendered, 'warm');
    const afterInput = rendered.find('input#warm-selectedMinimumAge');
    afterInput.simulate('change', { target: { value: '0' } });
    rendered.update();
    save(rendered);
    expectedErrorMessages(rendered, [positiveNumbersAboveZeroErrorMessage]);
  });
  test('should show positive number required error when trying to save warm phase with -1 for after', () => {
    const rendered = mountWithIntl(component);
    activatePhase(rendered, 'warm');
    const afterInput = rendered.find('input#warm-selectedMinimumAge');
    afterInput.simulate('change', { target: { value: '-1' } });
    rendered.update();
    save(rendered);
    expectedErrorMessages(rendered, [positiveNumberRequiredMessage]);
  });
  test('should show positive number required above zero error when trying to save warm phase with 0 for shrink', () => {
    const rendered = mountWithIntl(component);
    activatePhase(rendered, 'warm');
    findTestSubject(rendered, 'shrinkSwitch').simulate('change', { target: { checked: true } });
    rendered.update();
    const shrinkInput = rendered.find('input#warm-selectedPrimaryShardCount');
    shrinkInput.simulate('change', { target: { value: '0' } });
    rendered.update();
    save(rendered);
    expectedErrorMessages(rendered, [positiveNumbersAboveZeroErrorMessage]);
  });
  test('should show positive number above 0 required error when trying to save warm phase with -1 for shrink', () => {
    const rendered = mountWithIntl(component);
    activatePhase(rendered, 'warm');
    findTestSubject(rendered, 'shrinkSwitch').simulate('change', { target: { checked: true } });
    rendered.update();
    const shrinkInput = rendered.find('input#warm-selectedPrimaryShardCount');
    shrinkInput.simulate('change', { target: { value: '-1' } });
    rendered.update();
    save(rendered);
    expectedErrorMessages(rendered, [positiveNumbersAboveZeroErrorMessage]);
  });
  test('should show positive number required above zero error when trying to save warm phase with 0 for force merge', () => {
    const rendered = mountWithIntl(component);
    activatePhase(rendered, 'warm');
    findTestSubject(rendered, 'forceMergeSwitch').simulate('change', { target: { checked: true } });
    rendered.update();
    const shrinkInput = rendered.find('input#warm-selectedForceMergeSegments');
    shrinkInput.simulate('change', { target: { value: '0' } });
    rendered.update();
    save(rendered);
    expectedErrorMessages(rendered, [positiveNumbersAboveZeroErrorMessage]);
  });
  test('should show positive number above 0 required error when trying to save warm phase with -1 for force merge', () => {
    const rendered = mountWithIntl(component);
    activatePhase(rendered, 'warm');
    findTestSubject(rendered, 'forceMergeSwitch').simulate('change', { target: { checked: true } });
    rendered.update();
    const shrinkInput = rendered.find('input#warm-selectedForceMergeSegments');
    shrinkInput.simulate('change', { target: { value: '-1' } });
    rendered.update();
    save(rendered);
    expectedErrorMessages(rendered, [positiveNumbersAboveZeroErrorMessage]);
  });
  test('should show positive number required error when trying to save cold phase with -1 for after', () => {
    const rendered = mountWithIntl(component);
    activatePhase(rendered, 'cold');
    const afterInput = rendered.find('input#cold-selectedMinimumAge');
    afterInput.simulate('change', { target: { value: '-1' } });
    rendered.update();
    save(rendered);
    expectedErrorMessages(rendered, [positiveNumberRequiredMessage]);
  });
  test('should show positive number required error when trying to save delete phase with -1 for after', () => {
    const rendered = mountWithIntl(component);
    activatePhase(rendered, 'delete');
    const afterInput = rendered.find('input#delete-selectedMinimumAge');
    afterInput.simulate('change', { target: { value: '-1' } });
    rendered.update();
    save(rendered);
    expectedErrorMessages(rendered, [positiveNumberRequiredMessage]);
  });
});
