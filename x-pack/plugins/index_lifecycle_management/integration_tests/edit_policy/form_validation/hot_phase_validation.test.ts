/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { i18nTexts } from '../../../public/application/sections/edit_policy/i18n_texts';
import { setupEnvironment } from '../../helpers';
import { setupValidationTestBed, ValidationTestBed } from './validation.helpers';

describe('<EditPolicy /> hot phase validation', () => {
  let testBed: ValidationTestBed;
  let actions: ValidationTestBed['actions'];
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    httpRequestsMockHelpers.setLoadPolicies([]);
    await act(async () => {
      testBed = await setupValidationTestBed(httpSetup);
    });

    const { component } = testBed;
    component.update();
    ({ actions } = testBed);
    await actions.setPolicyName('mypolicy');
  });

  describe('rollover', () => {
    test(`doesn't allow no max primary shard size, no max primary docs, no max age, no max docs, no max index size`, async () => {
      await actions.rollover.toggleDefault();
      expect(actions.rollover.hasSettingRequiredCallout()).toBeFalsy();

      await actions.rollover.setMaxPrimaryShardSize('');
      await actions.rollover.setMaxPrimaryShardDocs('');
      await actions.rollover.setMaxAge('');
      await actions.rollover.setMaxDocs('');
      await actions.rollover.setMaxSize('');

      actions.errors.waitForValidation();

      expect(actions.rollover.hasSettingRequiredCallout()).toBeTruthy();
    });

    describe('max primary shard size', () => {
      test(`doesn't allow -1`, async () => {
        await actions.rollover.toggleDefault();
        await actions.rollover.setMaxPrimaryShardSize('-1');

        actions.errors.waitForValidation();

        actions.errors.expectMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
      });

      test(`doesn't allow 0`, async () => {
        await actions.rollover.toggleDefault();
        await actions.rollover.setMaxPrimaryShardSize('0');

        actions.errors.waitForValidation();

        actions.errors.expectMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
      });
    });

    describe('max primary docs size', () => {
      test(`doesn't allow -1`, async () => {
        await actions.rollover.toggleDefault();
        await actions.rollover.setMaxPrimaryShardDocs('-1');

        actions.errors.waitForValidation();

        actions.errors.expectMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
      });

      test(`doesn't allow 0`, async () => {
        await actions.rollover.toggleDefault();
        await actions.rollover.setMaxPrimaryShardDocs('0');

        actions.errors.waitForValidation();

        actions.errors.expectMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
      });

      test(`doesn't allow decimals`, async () => {
        await actions.rollover.toggleDefault();
        await actions.rollover.setMaxPrimaryShardDocs('5.5');

        actions.errors.waitForValidation();

        actions.errors.expectMessages([i18nTexts.editPolicy.errors.integerRequired]);
      });
    });

    describe('max size', () => {
      test(`doesn't allow -1`, async () => {
        await actions.rollover.toggleDefault();
        await actions.rollover.setMaxSize('-1');

        actions.errors.waitForValidation();

        actions.errors.expectMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
      });

      test(`doesn't allow 0`, async () => {
        await actions.rollover.toggleDefault();
        await actions.rollover.setMaxSize('0');

        actions.errors.waitForValidation();

        actions.errors.expectMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
      });
    });

    describe('max age', () => {
      test(`doesn't allow -1`, async () => {
        await actions.rollover.toggleDefault();
        await actions.rollover.setMaxAge('-1');

        actions.errors.waitForValidation();

        actions.errors.expectMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
      });

      test(`doesn't allow 0`, async () => {
        await actions.rollover.toggleDefault();
        await actions.rollover.setMaxAge('0');

        actions.errors.waitForValidation();

        actions.errors.expectMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
      });

      test(`doesn't allow decimals`, async () => {
        await actions.rollover.toggleDefault();
        await actions.rollover.setMaxAge('5.5');

        actions.errors.waitForValidation();

        actions.errors.expectMessages([i18nTexts.editPolicy.errors.integerRequired]);
      });
    });

    describe('max docs', () => {
      test(`doesn't allow -1`, async () => {
        await actions.rollover.toggleDefault();
        await actions.rollover.setMaxDocs('-1');

        actions.errors.waitForValidation();

        actions.errors.expectMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
      });

      test(`doesn't allow 0`, async () => {
        await actions.rollover.toggleDefault();
        await actions.rollover.setMaxDocs('0');

        actions.errors.waitForValidation();

        actions.errors.expectMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
      });

      test(`doesn't allow decimals`, async () => {
        await actions.rollover.toggleDefault();
        await actions.rollover.setMaxDocs('5.5');

        actions.errors.waitForValidation();

        actions.errors.expectMessages([i18nTexts.editPolicy.errors.integerRequired]);
      });
    });
  });

  describe('forcemerge', () => {
    test(`doesn't allow 0 for forcemerge`, async () => {
      await actions.hot.toggleForceMerge();
      await actions.hot.setForcemergeSegmentsCount('0');
      actions.errors.waitForValidation();
      actions.errors.expectMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
    test(`doesn't allow -1 for forcemerge`, async () => {
      await actions.hot.toggleForceMerge();
      await actions.hot.setForcemergeSegmentsCount('-1');
      actions.errors.waitForValidation();
      actions.errors.expectMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
  });

  describe('shrink', () => {
    test(`doesn't allow 0 for shrink size`, async () => {
      await actions.hot.setShrinkSize('0');
      actions.errors.waitForValidation();
      actions.errors.expectMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
    test(`doesn't allow -1 for shrink size`, async () => {
      await actions.hot.setShrinkSize('-1');
      actions.errors.waitForValidation();
      actions.errors.expectMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
    test(`doesn't allow 0 for shrink count`, async () => {
      await actions.hot.setShrinkCount('0');
      actions.errors.waitForValidation();
      actions.errors.expectMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
    test(`doesn't allow -1 for shrink count`, async () => {
      await actions.hot.setShrinkCount('-1');
      actions.errors.waitForValidation();
      actions.errors.expectMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
  });

  describe('index priority', () => {
    test(`doesn't allow -1 for index priority`, async () => {
      await actions.hot.setIndexPriority('-1');
      actions.errors.waitForValidation();
      actions.errors.expectMessages([i18nTexts.editPolicy.errors.nonNegativeNumberRequired]);
    });

    test(`allows 0 for index priority`, async () => {
      await actions.hot.setIndexPriority('0');
      actions.errors.waitForValidation();
      actions.errors.expectMessages([]);
    });
  });
});
