/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { i18nTexts } from '../../../../public/application/sections/edit_policy/i18n_texts';
import { setupEnvironment } from '../../helpers/setup_environment';
import { EditPolicyTestBed, setup } from '../edit_policy.helpers';
import { getGeneratedPolicies } from '../constants';

describe('<EditPolicy /> policy name validation', () => {
  let testBed: EditPolicyTestBed;
  let actions: EditPolicyTestBed['actions'];
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
    server.restore();
  });

  beforeEach(async () => {
    httpRequestsMockHelpers.setLoadPolicies(getGeneratedPolicies());

    await act(async () => {
      testBed = await setup();
    });

    const { component } = testBed;
    component.update();
    ({ actions } = testBed);
  });

  test(`doesn't allow empty policy name`, async () => {
    await actions.savePolicy();
    actions.errors.expectMessages([i18nTexts.editPolicy.errors.policyNameRequiredMessage]);
  });

  test(`doesn't allow policy name with space`, async () => {
    await actions.setPolicyName('my policy');
    actions.errors.waitForValidation();
    actions.errors.expectMessages([i18nTexts.editPolicy.errors.policyNameContainsInvalidChars]);
  });

  test(`doesn't allow policy name that is already used`, async () => {
    await actions.setPolicyName('testy0');
    actions.errors.waitForValidation();
    actions.errors.expectMessages([i18nTexts.editPolicy.errors.policyNameAlreadyUsedErrorMessage]);
  });

  test(`doesn't allow to save as new policy but using the same name`, async () => {
    await act(async () => {
      testBed = await setup({
        testBedConfig: {
          memoryRouter: {
            initialEntries: [`/policies/edit/testy0`],
            componentRoutePath: `/policies/edit/:policyName`,
          },
        },
      });
    });
    const { component } = testBed;
    component.update();
    ({ actions } = testBed);

    await actions.toggleSaveAsNewPolicy();
    actions.errors.waitForValidation();
    await actions.savePolicy();
    actions.errors.expectMessages([
      i18nTexts.editPolicy.errors.policyNameMustBeDifferentErrorMessage,
    ]);
  });

  test(`doesn't allow policy name with comma`, async () => {
    await actions.setPolicyName('my,policy');
    actions.errors.waitForValidation();
    actions.errors.expectMessages([i18nTexts.editPolicy.errors.policyNameContainsInvalidChars]);
  });

  test(`doesn't allow policy name starting with underscore`, async () => {
    await actions.setPolicyName('_mypolicy');
    actions.errors.waitForValidation();
    actions.errors.expectMessages([
      i18nTexts.editPolicy.errors.policyNameStartsWithUnderscoreErrorMessage,
    ]);
  });
});
