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

describe('<EditPolicy /> cold phase validation', () => {
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
      testBed = await setupValidationTestBed();
    });

    const { component, actions } = testBed;
    component.update();
    await actions.setPolicyName('mypolicy');
    await actions.togglePhase('cold');
  });

  describe('replicas', () => {
    test(`doesn't allow -1 for replicas`, async () => {
      const { actions } = testBed;

      await actions.cold.setReplicas('-1');

      actions.errors.waitForValidation();

      actions.errors.expectMessages([i18nTexts.editPolicy.errors.nonNegativeNumberRequired]);
    });

    test(`allows 0 for replicas`, async () => {
      const { actions } = testBed;

      await actions.cold.setReplicas('0');

      actions.errors.waitForValidation();

      actions.errors.expectMessages([]);
    });
  });

  describe('index priority', () => {
    test(`doesn't allow -1 for index priority`, async () => {
      const { actions } = testBed;

      await actions.cold.setIndexPriority('-1');

      actions.errors.waitForValidation();

      actions.errors.expectMessages([i18nTexts.editPolicy.errors.nonNegativeNumberRequired]);
    });

    test(`allows 0 for index priority`, async () => {
      const { actions } = testBed;

      await actions.cold.setIndexPriority('0');

      actions.errors.waitForValidation();

      actions.errors.expectMessages([]);
    });
  });
});
