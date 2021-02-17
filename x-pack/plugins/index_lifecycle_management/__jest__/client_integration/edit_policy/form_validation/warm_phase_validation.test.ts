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

describe('<EditPolicy /> warm phase validation', () => {
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
    httpRequestsMockHelpers.setListNodes({
      nodesByRoles: { data: ['node1'] },
      nodesByAttributes: { 'attribute:true': ['node1'] },
      isUsingDeprecatedDataRoleConfig: true,
    });
    httpRequestsMockHelpers.setNodesDetails('attribute:true', [
      { nodeId: 'testNodeId', stats: { name: 'testNodeName', host: 'testHost' } },
    ]);

    await act(async () => {
      testBed = await setup();
    });

    const { component, actions } = testBed;
    component.update();
    await actions.setPolicyName('mypolicy');
    await actions.warm.enable(true);

    ({ runTimers } = testBed);
  });

  describe('timing', () => {
    test(`doesn't allow empty timing`, async () => {
      const { actions } = testBed;

      await actions.warm.setMinAgeValue('');

      runTimers();

      actions.expectErrorMessages([i18nTexts.editPolicy.errors.nonNegativeNumberRequired]);
    });

    test(`allows 0 for phase timing`, async () => {
      const { actions } = testBed;

      await actions.warm.setMinAgeValue('0');

      runTimers();

      actions.expectErrorMessages([]);
    });

    test(`doesn't allow -1 for timing`, async () => {
      const { actions } = testBed;

      await actions.warm.setMinAgeValue('-1');

      runTimers();

      actions.expectErrorMessages([i18nTexts.editPolicy.errors.nonNegativeNumberRequired]);
    });
  });

  describe('replicas', () => {
    test(`doesn't allow -1 for replicas`, async () => {
      const { actions } = testBed;

      await actions.warm.setReplicas('-1');

      runTimers();

      actions.expectErrorMessages([i18nTexts.editPolicy.errors.nonNegativeNumberRequired]);
    });

    test(`allows 0 for replicas`, async () => {
      const { actions } = testBed;

      await actions.warm.setReplicas('0');

      runTimers();

      actions.expectErrorMessages([]);
    });
  });

  describe('shrink', () => {
    test(`doesn't allow 0 for shrink`, async () => {
      const { actions } = testBed;

      await actions.warm.toggleShrink(true);
      await actions.warm.setShrink('0');

      runTimers();

      actions.expectErrorMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
    test(`doesn't allow -1 for shrink`, async () => {
      const { actions } = testBed;

      await actions.warm.toggleShrink(true);
      await actions.warm.setShrink('-1');

      runTimers();

      actions.expectErrorMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
  });

  describe('forcemerge', () => {
    test(`doesn't allow 0 for forcemerge`, async () => {
      const { actions } = testBed;

      await actions.warm.toggleForceMerge(true);
      await actions.warm.setForcemergeSegmentsCount('0');

      runTimers();

      actions.expectErrorMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
    test(`doesn't allow -1 for forcemerge`, async () => {
      const { actions } = testBed;

      await actions.warm.toggleForceMerge(true);
      await actions.warm.setForcemergeSegmentsCount('-1');

      runTimers();

      actions.expectErrorMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    });
  });

  describe('index priority', () => {
    test(`doesn't allow -1 for index priority`, async () => {
      const { actions } = testBed;

      await actions.warm.setIndexPriority('-1');

      runTimers();

      actions.expectErrorMessages([i18nTexts.editPolicy.errors.nonNegativeNumberRequired]);
    });

    test(`allows 0 for index priority`, async () => {
      const { actions } = testBed;

      await actions.warm.setIndexPriority('0');

      runTimers();

      actions.expectErrorMessages([]);
    });
  });
});
