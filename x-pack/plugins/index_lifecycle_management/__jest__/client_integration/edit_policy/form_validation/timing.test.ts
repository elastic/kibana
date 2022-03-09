/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { i18nTexts } from '../../../../public/application/sections/edit_policy/i18n_texts';

import { PhaseWithTiming } from '../../../../common/types';
import { setupEnvironment } from '../../helpers';
import { setupValidationTestBed, ValidationTestBed } from './validation.helpers';

describe('<EditPolicy /> timing validation', () => {
  let testBed: ValidationTestBed;
  let actions: ValidationTestBed['actions'];
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
    server.restore();
  });

  beforeEach(async () => {
    httpRequestsMockHelpers.setDefaultResponses();
    httpRequestsMockHelpers.setLoadPolicies([]);

    await act(async () => {
      testBed = await setupValidationTestBed();
    });

    const { component } = testBed;
    component.update();
    ({ actions } = testBed);
    await actions.setPolicyName('mypolicy');
  });

  [
    {
      name: `doesn't allow empty timing`,
      value: '',
      error: [i18nTexts.editPolicy.errors.numberRequired],
    },
    {
      name: `allows 0 for timing`,
      value: '0',
      error: [],
    },
    {
      name: `doesn't allow -1 for timing`,
      value: '-1',
      error: [i18nTexts.editPolicy.errors.nonNegativeNumberRequired],
    },
    {
      name: `doesn't allow decimals for timing (with dot)`,
      value: '5.5',
      error: [i18nTexts.editPolicy.errors.integerRequired],
    },
    {
      name: `doesn't allow decimals for timing (with comma)`,
      value: '5,5',
      error: [i18nTexts.editPolicy.errors.integerRequired],
    },
  ].forEach((testConfig: { name: string; value: string; error: string[] }) => {
    ['warm', 'cold', 'delete', 'frozen'].forEach((phase: string) => {
      const { name, value, error } = testConfig;
      test(`${phase}: ${name}`, async () => {
        await actions.togglePhase(phase as PhaseWithTiming);
        // 1. We first set as dummy value to have a starting min_age value
        await actions[phase as PhaseWithTiming].setMinAgeValue('111');
        // 2. At this point we are sure there will be a change of value and that any validation
        // will be displayed under the field.
        await actions[phase as PhaseWithTiming].setMinAgeValue(value);

        actions.errors.waitForValidation();

        actions.errors.expectMessages(error);
      });
    });
  });

  test('should validate that min_age is equal or greater than previous phase min_age', async () => {
    await actions.togglePhase('warm');
    await actions.togglePhase('cold');
    await actions.togglePhase('frozen');
    await actions.togglePhase('delete');

    await actions.warm.setMinAgeValue('10');

    await actions.cold.setMinAgeValue('9');
    actions.errors.waitForValidation();
    actions.errors.expectMessages(
      ['Must be greater or equal than the warm phase value (10d)'],
      'cold'
    );

    await actions.frozen.setMinAgeValue('8');
    actions.errors.waitForValidation();
    actions.errors.expectMessages(
      ['Must be greater or equal than the cold phase value (9d)'],
      'frozen'
    );

    await actions.delete.setMinAgeValue('7');
    actions.errors.waitForValidation();
    actions.errors.expectMessages(
      ['Must be greater or equal than the frozen phase value (8d)'],
      'delete'
    );

    // Disable the warm phase
    await actions.togglePhase('warm');

    // No more error for the cold phase
    actions.errors.expectMessages([], 'cold');

    // Change to smaller unit for cold phase
    await actions.cold.setMinAgeUnits('h');

    // No more error for the frozen phase...
    actions.errors.expectMessages([], 'frozen');
    // ...but the delete phase has still the error
    actions.errors.expectMessages(
      ['Must be greater or equal than the frozen phase value (8d)'],
      'delete'
    );

    await actions.delete.setMinAgeValue('9');
    // No more error for the delete phase
    actions.errors.expectMessages([], 'delete');
  });
});
