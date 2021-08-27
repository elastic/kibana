/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setupEnvironment } from '../../../helpers';
import { NodeAllocationTestBed, setupColdPhaseNodeAllocation } from './cold_phase.helpers';

describe('<EditPolicy /> node allocation in the cold phase', () => {
  let testBed: NodeAllocationTestBed;
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
    server.restore();
  });

  const setup = async () => {
    await act(async () => {
      testBed = await setupColdPhaseNodeAllocation();
    });
  };

  beforeEach(async () => {
    server.respondImmediately = true;
    httpRequestsMockHelpers.setLoadPolicies([]);
    httpRequestsMockHelpers.setListNodes({
      nodesByRoles: { data: ['node1'] },
      nodesByAttributes: { 'attribute:true': ['node1'] },
      isUsingDeprecatedDataRoleConfig: true,
    });
    httpRequestsMockHelpers.setNodesDetails('attribute:true', [
      { nodeId: 'testNodeId', stats: { name: 'testNodeName', host: 'testHost' } },
    ]);

    await setup();

    const { component } = testBed;
    component.update();
  });

  test(`doesn't offer allocation guidance when node with deprecated "data" role exists`, async () => {
    httpRequestsMockHelpers.setListNodes({
      nodesByAttributes: {},
      nodesByRoles: { data: ['test'] },
      isUsingDeprecatedDataRoleConfig: false,
    });
    await setup();
    const { actions, component } = testBed;

    component.update();
    await actions.toggleColdPhase();

    expect(actions.isAllocationLoading()).toBeFalsy();
    expect(actions.hasWillUseFallbackTierNotice()).toBeFalsy();
  });

  describe('when using node attributes', () => {
    test('shows spinner for node attributes input when loading', async () => {
      server.respondImmediately = false;

      const { actions } = testBed;
      await actions.toggleColdPhase();

      expect(actions.isAllocationLoading()).toBeTruthy();
      expect(actions.hasDataTierAllocationControls()).toBeTruthy();
      expect(actions.hasNodeAttributesSelect()).toBeFalsy();

      // No notices will be shown.
      expect(actions.hasDefaultToDataTiersNotice()).toBeFalsy();
      expect(actions.hasWillUseFallbackTierUsingNodeAttributesNotice()).toBeFalsy();
      expect(actions.hasDefaultToDataNodesNotice()).toBeFalsy();
      expect(actions.hasNoTiersAvailableUsingNodeAttributesNotice()).toBeFalsy();
    });

    describe('and some are defined', () => {
      test('shows the node attributes input', async () => {
        const { actions } = testBed;
        await actions.toggleColdPhase();

        expect(actions.isAllocationLoading()).toBeFalsy();
        await actions.setDataAllocation('node_attrs');
        expect(actions.hasDefaultAllocationBehaviorNotice()).toBeFalsy();
        expect(actions.hasNodeAttributesSelect()).toBeTruthy();
        expect(actions.getNodeAttributesSelectOptions().length).toBe(2);
      });

      test('shows view node attributes link when an attribute is selected and shows flyout when clicked', async () => {
        const { actions } = testBed;

        await actions.toggleColdPhase();

        expect(actions.isAllocationLoading()).toBeFalsy();
        await actions.setDataAllocation('node_attrs');
        expect(actions.hasDefaultAllocationBehaviorNotice()).toBeFalsy();
        expect(actions.hasNodeAttributesSelect()).toBeTruthy();

        expect(actions.hasNodeDetailsFlyout()).toBeFalsy();
        expect(actions.getNodeAttributesSelectOptions().length).toBe(2);
        await actions.setSelectedNodeAttribute('attribute:true');

        await actions.openNodeDetailsFlyout();
        expect(actions.hasNodeDetailsFlyout()).toBeTruthy();
      });
    });

    describe('and none are defined', () => {
      const commonSetupAndBaselineAssertions = async () => {
        await setup();
        const { actions, component } = testBed;
        component.update();
        await actions.toggleColdPhase();

        expect(actions.isAllocationLoading()).toBeFalsy();
        await actions.setDataAllocation('node_attrs');
        expect(actions.hasNodeAttributesSelect()).toBeFalsy();
      };

      test('and data tiers are available, shows DefaultToDataTiersNotice', async () => {
        httpRequestsMockHelpers.setListNodes({
          nodesByAttributes: {},
          nodesByRoles: { data: ['node1'] },
          isUsingDeprecatedDataRoleConfig: false,
        });

        await commonSetupAndBaselineAssertions();
        const { actions } = testBed;
        expect(actions.hasDefaultToDataTiersNotice()).toBeTruthy();
      });

      test('and data tiers are available, but not for the cold phase, shows WillUseFallbackTierUsingNodeAttributesNotice', async () => {
        httpRequestsMockHelpers.setListNodes({
          nodesByAttributes: {},
          nodesByRoles: { data_warm: ['node1'] },
          isUsingDeprecatedDataRoleConfig: false,
        });

        await commonSetupAndBaselineAssertions();
        const { actions } = testBed;
        expect(actions.hasWillUseFallbackTierUsingNodeAttributesNotice()).toBeTruthy();
      });

      test('when data nodes are in use, shows DefaultToDataNodesNotice', async () => {
        httpRequestsMockHelpers.setListNodes({
          nodesByAttributes: {},
          nodesByRoles: {},
          isUsingDeprecatedDataRoleConfig: true,
        });

        await commonSetupAndBaselineAssertions();
        const { actions } = testBed;
        expect(actions.hasDefaultToDataNodesNotice()).toBeTruthy();
      });

      test('when no data tier node roles are defined, shows NoTiersAvailableUsingNodeAttributesNotice', async () => {
        httpRequestsMockHelpers.setListNodes({
          nodesByAttributes: {},
          // data_content is a node role so they're technically in use, but it's not a data tier node role.
          nodesByRoles: { data_content: ['node1'] },
          isUsingDeprecatedDataRoleConfig: false,
        });

        await commonSetupAndBaselineAssertions();
        const { actions } = testBed;
        expect(actions.hasNoTiersAvailableUsingNodeAttributesNotice()).toBeTruthy();
      });
    });
  });

  describe('when using node roles', () => {
    test('when no node roles are defined, shows NoTiersAvailableNotice', async () => {
      httpRequestsMockHelpers.setListNodes({
        nodesByAttributes: {},
        nodesByRoles: {},
        isUsingDeprecatedDataRoleConfig: false,
      });

      await setup();
      const { actions, component } = testBed;

      component.update();
      await actions.toggleColdPhase();

      expect(actions.isAllocationLoading()).toBeFalsy();
      expect(actions.hasNoTiersAvailableNotice()).toBeTruthy();
    });

    [
      {
        nodesByRoles: { data_hot: ['test'] },
        fallbackTier: 'hot',
      },
      {
        nodesByRoles: { data_hot: ['test'], data_warm: ['test'] },
        fallbackTier: 'warm',
      },
    ].forEach(({ nodesByRoles, fallbackTier }) => {
      test(`when allocation will fallback to the ${fallbackTier} tier, shows WillUseFallbackTierNotice and defines the fallback tier`, async () => {
        httpRequestsMockHelpers.setListNodes({
          nodesByAttributes: {},
          nodesByRoles,
          isUsingDeprecatedDataRoleConfig: false,
        });

        await setup();
        const { actions, component } = testBed;

        component.update();
        await actions.toggleColdPhase();

        expect(actions.isAllocationLoading()).toBeFalsy();
        expect(actions.hasWillUseFallbackTierNotice()).toBeTruthy();
        expect(actions.getWillUseFallbackTierNoticeText()).toContain(
          `No nodes assigned to the cold tierIf no cold nodes are available, data is stored in the ${fallbackTier} tier.`
        );
      });
    });
  });
});
