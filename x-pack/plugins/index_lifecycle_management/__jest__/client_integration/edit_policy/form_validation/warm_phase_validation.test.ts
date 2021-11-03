/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { i18nTexts } from '../../../../public/application/sections/edit_policy/i18n_texts';
import { setupEnvironment } from '../../helpers';
import { setupValidationTestBed, ValidationTestBed } from './validation.helpers';

describe('<EditPolicy /> warm phase validation', () => {
  let testBed: ValidationTestBed;
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

    const { component, actions } = testBed;
    component.update();
    await actions.setPolicyName('mypolicy');
    await actions.togglePhase('warm');
  });

  describe('replicas', () => {
    test(`doesn't allow -1 for replicas`, async () => {
      const { actions } = testBed;
      await actions.warm.setReplicas('-1');

      actions.errors.waitForValidation();

      actions.errors.expectMessages([i18nTexts.editPolicy.errors.nonNegativeNumberRequired]);
    });

    test(`allows 0 for replicas`, async () => {
      const { actions } = testBed;
      await actions.warm.setReplicas('0');

      actions.errors.waitForValidation();

      actions.errors.expectMessages([]);
    });
  });

  describe('shrink', () => {
    test(`doesn't allow 0 for shrink size`, async () => {
      const { actions } = testBed;
      await actions.warm.setShrinkSize('0');

      actions.errors.waitForValidation();

      actions.errors.expectMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
    test(`doesn't allow -1 for shrink size`, async () => {
      const { actions } = testBed;
      await actions.warm.setShrinkSize('-1');

      actions.errors.waitForValidation();

      actions.errors.expectMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
    test(`doesn't allow 0 for shrink count`, async () => {
      const { actions } = testBed;
      await actions.warm.setShrinkCount('0');

      actions.errors.waitForValidation();

      actions.errors.expectMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
    test(`doesn't allow -1 for shrink count`, async () => {
      const { actions } = testBed;
      await actions.warm.setShrinkCount('-1');

      actions.errors.waitForValidation();

      actions.errors.expectMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
  });

  describe('forcemerge', () => {
    test(`doesn't allow 0 for forcemerge`, async () => {
      const { actions } = testBed;
      await actions.warm.toggleForceMerge();
      await actions.warm.setForcemergeSegmentsCount('0');

      actions.errors.waitForValidation();

      actions.errors.expectMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
    test(`doesn't allow -1 for forcemerge`, async () => {
      const { actions } = testBed;
      await actions.warm.toggleForceMerge();
      await actions.warm.setForcemergeSegmentsCount('-1');

      actions.errors.waitForValidation();

      actions.errors.expectMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
  });

  describe('index priority', () => {
    test(`doesn't allow -1 for index priority`, async () => {
      const { actions } = testBed;
      await actions.warm.setIndexPriority('-1');

      actions.errors.waitForValidation();

      actions.errors.expectMessages([i18nTexts.editPolicy.errors.nonNegativeNumberRequired]);
    });

    test(`allows 0 for index priority`, async () => {
      const { actions } = testBed;
      await actions.warm.setIndexPriority('0');

      actions.errors.waitForValidation();

      actions.errors.expectMessages([]);
    });
  });
});
