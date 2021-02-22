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

describe('<EditPolicy /> hot phase validation', () => {
  let testBed: EditPolicyTestBed;
  let runTimers: () => void;
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
    server.restore();
  });

  beforeEach(async () => {
    httpRequestsMockHelpers.setLoadPolicies([]);
    await act(async () => {
      testBed = await setup();
    });

    const { component, actions } = testBed;
    component.update();
    await actions.setPolicyName('mypolicy');

    ({ runTimers } = testBed);
  });

  describe('rollover', () => {
    test(`doesn't allow no max size, no max age and no max docs`, async () => {
      const { actions } = testBed;

      await actions.hot.toggleDefaultRollover(false);
      expect(actions.hot.hasRolloverSettingRequiredCallout()).toBeFalsy();

      await actions.hot.setMaxSize('');
      await actions.hot.setMaxAge('');
      await actions.hot.setMaxDocs('');

      runTimers();

      expect(actions.hot.hasRolloverSettingRequiredCallout()).toBeTruthy();
    });

    test(`doesn't allow -1 for max size`, async () => {
      const { actions } = testBed;

      await actions.hot.toggleDefaultRollover(false);
      await actions.hot.setMaxSize('-1');

      runTimers();

      actions.expectErrorMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });

    test(`doesn't allow 0 for max size`, async () => {
      const { actions } = testBed;

      await actions.hot.toggleDefaultRollover(false);
      await actions.hot.setMaxSize('0');

      runTimers();

      actions.expectErrorMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });

    test(`doesn't allow -1 for max age`, async () => {
      const { actions } = testBed;

      await actions.hot.toggleDefaultRollover(false);
      await actions.hot.setMaxAge('-1');

      runTimers();

      actions.expectErrorMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });

    test(`doesn't allow 0 for max age`, async () => {
      const { actions } = testBed;

      await actions.hot.toggleDefaultRollover(false);
      await actions.hot.setMaxAge('0');

      runTimers();

      actions.expectErrorMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });

    test(`doesn't allow -1 for max docs`, async () => {
      const { actions } = testBed;

      await actions.hot.toggleDefaultRollover(false);
      await actions.hot.setMaxDocs('-1');

      runTimers();

      actions.expectErrorMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });

    test(`doesn't allow 0 for max docs`, async () => {
      const { actions } = testBed;

      await actions.hot.toggleDefaultRollover(false);
      await actions.hot.setMaxDocs('0');

      runTimers();

      actions.expectErrorMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
  });

  describe('forcemerge', () => {
    test(`doesn't allow 0 for forcemerge`, async () => {
      const { actions } = testBed;
      await actions.hot.toggleForceMerge(true);
      await actions.hot.setForcemergeSegmentsCount('0');
      runTimers();
      actions.expectErrorMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
    test(`doesn't allow -1 for forcemerge`, async () => {
      const { actions } = testBed;
      await actions.hot.toggleForceMerge(true);
      await actions.hot.setForcemergeSegmentsCount('-1');
      runTimers();
      actions.expectErrorMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
  });

  describe('shrink', () => {
    test(`doesn't allow 0 for shrink`, async () => {
      const { actions } = testBed;
      await actions.hot.toggleShrink(true);
      await actions.hot.setShrink('0');
      runTimers();
      actions.expectErrorMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
    test(`doesn't allow -1 for shrink`, async () => {
      const { actions } = testBed;
      await actions.hot.toggleShrink(true);
      await actions.hot.setShrink('-1');
      runTimers();
      actions.expectErrorMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
  });

  describe('index priority', () => {
    test(`doesn't allow -1 for index priority`, async () => {
      const { actions } = testBed;

      await actions.hot.setIndexPriority('-1');
      runTimers();
      actions.expectErrorMessages([i18nTexts.editPolicy.errors.nonNegativeNumberRequired]);
    });

    test(`allows 0 for index priority`, async () => {
      const { actions } = testBed;

      await actions.hot.setIndexPriority('0');
      runTimers();
      actions.expectErrorMessages([]);
    });
  });
});
