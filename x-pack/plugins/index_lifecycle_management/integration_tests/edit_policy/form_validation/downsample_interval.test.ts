/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { i18nTexts } from '../../../public/application/sections/edit_policy/i18n_texts';

import { PhaseWithDownsample } from '../../../common/types';
import { setupEnvironment } from '../../helpers';
import { setupValidationTestBed, ValidationTestBed } from './validation.helpers';

describe('<EditPolicy /> downsample interval validation', () => {
  let testBed: ValidationTestBed;
  let actions: ValidationTestBed['actions'];
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    httpRequestsMockHelpers.setDefaultResponses();
    httpRequestsMockHelpers.setLoadPolicies([]);

    await act(async () => {
      testBed = await setupValidationTestBed(httpSetup);
    });

    const { component } = testBed;
    component.update();
    ({ actions } = testBed);
    await actions.setPolicyName('mypolicy');
  });

  [
    {
      name: `doesn't allow empty interval`,
      value: '',
      error: [i18nTexts.editPolicy.errors.numberRequired],
    },
    {
      name: `doesn't allow 0 for interval`,
      value: '0',
      error: [i18nTexts.editPolicy.errors.numberGreatThan0Required],
    },
    {
      name: `doesn't allow -1 for interval`,
      value: '-1',
      error: [i18nTexts.editPolicy.errors.numberGreatThan0Required],
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
    (['hot', 'warm', 'cold'] as PhaseWithDownsample[]).forEach((phase: PhaseWithDownsample) => {
      const { name, value, error } = testConfig;
      test(`${phase}: ${name}`, async () => {
        if (phase !== 'hot') {
          await actions.togglePhase(phase);
        }

        await actions[phase].downsample.toggle();

        // 1. We first set as dummy value to have a starting min_age value
        await actions[phase].downsample.setDownsampleInterval('111');
        // 2. At this point we are sure there will be a change of value and that any validation
        // will be displayed under the field.
        await actions[phase].downsample.setDownsampleInterval(value);

        actions.errors.waitForValidation();

        actions.errors.expectMessages(error);
      });
    });
  });

  test('should validate an interval is greater or multiple than previous phase interval', async () => {
    await actions.togglePhase('warm');
    await actions.togglePhase('cold');

    await actions.hot.downsample.toggle();
    await actions.hot.downsample.setDownsampleInterval('60', 'm');

    await actions.warm.downsample.toggle();
    await actions.warm.downsample.setDownsampleInterval('1', 'h');

    actions.errors.waitForValidation();
    actions.errors.expectMessages(
      ['Must be greater than and a multiple of the hot phase value (60m)'],
      'warm'
    );

    await actions.cold.downsample.toggle();
    await actions.cold.downsample.setDownsampleInterval('90', 'm');
    actions.errors.waitForValidation();
    actions.errors.expectMessages(
      ['Must be greater than and a multiple of the warm phase value (1h)'],
      'cold'
    );

    // disable warm phase, check that we now get an error because of the hot phase;
    await actions.togglePhase('warm');
    actions.errors.waitForValidation();
    actions.errors.expectMessages(
      ['Must be greater than and a multiple of the hot phase value (60m)'],
      'cold'
    );
    await actions.cold.downsample.setDownsampleInterval('120', 'm');
    actions.errors.waitForValidation();
    actions.errors.expectMessages([], 'cold');

    await actions.cold.downsample.setDownsampleInterval('90', 'm');
    actions.errors.waitForValidation();
    actions.errors.expectMessages(
      ['Must be greater than and a multiple of the hot phase value (60m)'],
      'cold'
    );
  });
});
