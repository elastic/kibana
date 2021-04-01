/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setupEnvironment } from '../../helpers/setup_environment';
import { EditPolicyTestBed, setup } from '../edit_policy.helpers';
import {
  POLICY_WITH_MIGRATE_OFF,
  POLICY_WITH_NODE_ATTR_AND_OFF_ALLOCATION,
  POLICY_WITH_NODE_ROLE_ALLOCATION,
} from '../constants';

describe('<EditPolicy /> node allocation', () => {
  let testBed: EditPolicyTestBed;
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
    server.restore();
  });

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

    await act(async () => {
      testBed = await setup();
    });

    const { component } = testBed;
    component.update();
  });

  describe('warm phase', () => {
    test('shows spinner for node attributes input when loading', async () => {
      server.respondImmediately = false;

      const { actions, component } = testBed;
      await actions.warm.enable(true);

      expect(component.find('.euiLoadingSpinner').exists()).toBeTruthy();
      expect(actions.warm.hasDataTierAllocationControls()).toBeTruthy();

      expect(component.find('.euiCallOut--warning').exists()).toBeFalsy();
      expect(actions.warm.hasNodeAttributesSelect()).toBeFalsy();
    });

    test('offers DATA TIER allocation guidance when no attributes exist and data tiers are available', async () => {
      httpRequestsMockHelpers.setListNodes({
        nodesByAttributes: {},
        nodesByRoles: { data: ['node1'] },
        isUsingDeprecatedDataRoleConfig: false,
      });

      await act(async () => {
        testBed = await setup();
      });
      const { actions, component } = testBed;

      component.update();
      await actions.warm.enable(true);

      expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();
      await actions.warm.setDataAllocation('node_attrs');
      expect(actions.warm.hasDefaultToDataTiersNotice()).toBeTruthy();
      expect(actions.warm.hasNodeAttributesSelect()).toBeFalsy();
    });

    test('offers DATA TIER FALLBACK allocation guidance when no attributes exist and data tiers are available, but not for the warm phase', async () => {
      httpRequestsMockHelpers.setListNodes({
        nodesByAttributes: {},
        nodesByRoles: { data_hot: ['node1'] },
        isUsingDeprecatedDataRoleConfig: false,
      });

      await act(async () => {
        testBed = await setup();
      });
      const { actions, component } = testBed;

      component.update();
      await actions.warm.enable(true);

      expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();
      await actions.warm.setDataAllocation('node_attrs');
      expect(actions.warm.hasWillUseFallbackTierNotice()).toBeTruthy();
      expect(actions.warm.hasNodeAttributesSelect()).toBeFalsy();
    });

    test('offers DATA NODE allocation guidance when no attributes exist and data nodes are in use', async () => {
      httpRequestsMockHelpers.setListNodes({
        nodesByAttributes: {},
        nodesByRoles: {},
        isUsingDeprecatedDataRoleConfig: true,
      });

      await act(async () => {
        testBed = await setup();
      });
      const { actions, component } = testBed;

      component.update();
      await actions.warm.enable(true);

      expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();
      await actions.warm.setDataAllocation('node_attrs');
      expect(actions.warm.hasDefaultToDataNodesNotice()).toBeTruthy();
      expect(actions.warm.hasNodeAttributesSelect()).toBeFalsy();
    });

    test('shows node attributes input when attributes exist', async () => {
      const { actions, component } = testBed;
      await actions.warm.enable(true);

      expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();
      await actions.warm.setDataAllocation('node_attrs');
      expect(actions.warm.hasDefaultAllocationBehaviorNotice()).toBeFalsy();
      expect(actions.warm.hasNodeAttributesSelect()).toBeTruthy();
      expect(actions.warm.getNodeAttributesSelectOptions().length).toBe(2);
    });

    test('shows view node attributes link when an attribute is selected and shows flyout when clicked', async () => {
      const { actions, component } = testBed;
      await actions.warm.enable(true);

      expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();
      await actions.warm.setDataAllocation('node_attrs');
      expect(actions.warm.hasDefaultAllocationBehaviorNotice()).toBeFalsy();
      expect(actions.warm.hasNodeAttributesSelect()).toBeTruthy();

      expect(actions.warm.hasNodeDetailsFlyout()).toBeFalsy();
      expect(actions.warm.getNodeAttributesSelectOptions().length).toBe(2);
      await actions.warm.setSelectedNodeAttribute('attribute:true');

      await actions.warm.openNodeDetailsFlyout();
      expect(actions.warm.hasNodeDetailsFlyout()).toBeTruthy();
    });

    test('offers allocation guidance when no node roles are found', async () => {
      httpRequestsMockHelpers.setListNodes({
        nodesByAttributes: {},
        nodesByRoles: {},
        isUsingDeprecatedDataRoleConfig: false,
      });

      await act(async () => {
        testBed = await setup();
      });
      const { actions, component } = testBed;

      component.update();
      await actions.warm.enable(true);

      expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();
      expect(actions.warm.hasNoTiersAvailableNotice()).toBeTruthy();
    });

    test('in the warm phase, offers allocation guidance when allocation will fallback to the hot tier', async () => {
      httpRequestsMockHelpers.setListNodes({
        nodesByAttributes: {},
        nodesByRoles: { data_hot: ['test'], data_cold: ['test'] },
        isUsingDeprecatedDataRoleConfig: false,
      });

      await act(async () => {
        testBed = await setup();
      });
      const { actions, component } = testBed;

      component.update();
      await actions.warm.enable(true);

      expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();
      expect(actions.warm.hasWillUseFallbackTierNotice()).toBeTruthy();
    });

    test(`doesn't offer allocation guidance when node with "data" role exists`, async () => {
      httpRequestsMockHelpers.setListNodes({
        nodesByAttributes: {},
        nodesByRoles: { data: ['test'] },
        isUsingDeprecatedDataRoleConfig: false,
      });
      await act(async () => {
        testBed = await setup();
      });
      const { actions, component } = testBed;

      component.update();
      await actions.warm.enable(true);

      expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();
      expect(actions.warm.hasDefaultAllocationBehaviorNotice()).toBeFalsy();
    });
  });

  describe('cold phase', () => {
    test('shows spinner for node attributes input when loading', async () => {
      server.respondImmediately = false;

      const { actions, component } = testBed;
      await actions.cold.enable(true);

      expect(component.find('.euiLoadingSpinner').exists()).toBeTruthy();
      expect(actions.cold.hasDataTierAllocationControls()).toBeTruthy();

      expect(component.find('.euiCallOut--warning').exists()).toBeFalsy();
      expect(actions.cold.hasNodeAttributesSelect()).toBeFalsy();
    });

    test('offers DATA TIER allocation guidance when no attributes exist and data tiers are available', async () => {
      httpRequestsMockHelpers.setListNodes({
        nodesByAttributes: {},
        nodesByRoles: { data: ['node1'] },
        isUsingDeprecatedDataRoleConfig: false,
      });

      await act(async () => {
        testBed = await setup();
      });
      const { actions, component } = testBed;

      component.update();
      await actions.cold.enable(true);

      expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();
      await actions.cold.setDataAllocation('node_attrs');
      expect(actions.cold.hasDefaultToDataTiersNotice()).toBeTruthy();
      expect(actions.cold.hasNodeAttributesSelect()).toBeFalsy();
    });

    test('offers DATA TIER FALLBACK allocation guidance when no attributes exist and data tiers are available, but not for the cold phase', async () => {
      httpRequestsMockHelpers.setListNodes({
        nodesByAttributes: {},
        nodesByRoles: { data_warm: ['node1'] },
        isUsingDeprecatedDataRoleConfig: false,
      });

      await act(async () => {
        testBed = await setup();
      });
      const { actions, component } = testBed;

      component.update();
      await actions.cold.enable(true);

      expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();
      await actions.cold.setDataAllocation('node_attrs');
      expect(actions.cold.hasWillUseFallbackTierNotice()).toBeTruthy();
      expect(actions.cold.hasNodeAttributesSelect()).toBeFalsy();
    });

    test('offers DATA NODE allocation guidance when no attributes exist and data nodes are in use', async () => {
      httpRequestsMockHelpers.setListNodes({
        nodesByAttributes: {},
        nodesByRoles: {},
        isUsingDeprecatedDataRoleConfig: true,
      });

      await act(async () => {
        testBed = await setup();
      });
      const { actions, component } = testBed;

      component.update();
      await actions.cold.enable(true);

      expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();
      await actions.cold.setDataAllocation('node_attrs');
      expect(actions.cold.hasDefaultToDataNodesNotice()).toBeTruthy();
      expect(actions.cold.hasNodeAttributesSelect()).toBeFalsy();
    });

    test('shows node attributes input when attributes exist', async () => {
      const { actions, component } = testBed;
      await actions.cold.enable(true);

      expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();
      await actions.cold.setDataAllocation('node_attrs');
      expect(actions.cold.hasDefaultAllocationBehaviorNotice()).toBeFalsy();
      expect(actions.cold.hasNodeAttributesSelect()).toBeTruthy();
      expect(actions.cold.getNodeAttributesSelectOptions().length).toBe(2);
    });

    test('shows view node attributes link when an attribute is selected and shows flyout when clicked', async () => {
      const { actions, component } = testBed;

      await actions.cold.enable(true);

      expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();
      await actions.cold.setDataAllocation('node_attrs');
      expect(actions.cold.hasDefaultAllocationBehaviorNotice()).toBeFalsy();
      expect(actions.cold.hasNodeAttributesSelect()).toBeTruthy();

      expect(actions.cold.hasNodeDetailsFlyout()).toBeFalsy();
      expect(actions.cold.getNodeAttributesSelectOptions().length).toBe(2);
      await actions.cold.setSelectedNodeAttribute('attribute:true');

      await actions.cold.openNodeDetailsFlyout();
      expect(actions.cold.hasNodeDetailsFlyout()).toBeTruthy();
    });

    test('offers allocation guidance when no node roles are found', async () => {
      httpRequestsMockHelpers.setListNodes({
        nodesByAttributes: {},
        nodesByRoles: {},
        isUsingDeprecatedDataRoleConfig: false,
      });

      await act(async () => {
        testBed = await setup();
      });
      const { actions, component } = testBed;

      component.update();
      await actions.cold.enable(true);

      expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();
      expect(actions.cold.hasNoTiersAvailableNotice()).toBeTruthy();
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
      test(`in the cold phase, offers allocation guidance when allocation will fallback to the ${fallbackTier} tier`, async () => {
        httpRequestsMockHelpers.setListNodes({
          nodesByAttributes: {},
          nodesByRoles,
          isUsingDeprecatedDataRoleConfig: false,
        });

        await act(async () => {
          testBed = await setup();
        });
        const { actions, component, find } = testBed;

        component.update();
        await actions.cold.enable(true);

        expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();
        expect(actions.cold.hasWillUseFallbackTierNotice()).toBeTruthy();
        expect(find('willUseFallbackTierNotice').text()).toContain(
          `This policy will move data in the cold phase to ${fallbackTier} tier nodes`
        );
      });
    });

    test(`doesn't offer allocation guidance when node with "data" role exists`, async () => {
      httpRequestsMockHelpers.setListNodes({
        nodesByAttributes: {},
        nodesByRoles: { data: ['test'] },
        isUsingDeprecatedDataRoleConfig: false,
      });
      await act(async () => {
        testBed = await setup();
      });
      const { actions, component } = testBed;

      component.update();
      await actions.cold.enable(true);

      expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();
      expect(actions.cold.hasWillUseFallbackTierNotice()).toBeFalsy();
    });
  });

  describe('not on cloud', () => {
    test('shows all allocation options, even if using legacy config', async () => {
      httpRequestsMockHelpers.setListNodes({
        nodesByAttributes: { test: ['123'] },
        nodesByRoles: { data: ['test'], data_hot: ['test'], data_warm: ['test'] },
        isUsingDeprecatedDataRoleConfig: true,
      });
      await act(async () => {
        testBed = await setup();
      });
      const { actions, component, exists } = testBed;

      component.update();
      await actions.warm.enable(true);
      expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();

      // Assert that default, custom and 'none' options exist
      await actions.warm.openNodeAttributesSection();
      expect(exists('defaultDataAllocationOption')).toBeTruthy();
      expect(exists('customDataAllocationOption')).toBeTruthy();
      expect(exists('noneDataAllocationOption')).toBeTruthy();
    });
  });

  describe('on cloud', () => {
    describe('using legacy data role config', () => {
      test('should hide data tier option on cloud', async () => {
        httpRequestsMockHelpers.setListNodes({
          nodesByAttributes: { test: ['123'] },
          // On cloud, if using legacy config there will not be any "data_*" roles set.
          nodesByRoles: { data: ['test'] },
          isUsingDeprecatedDataRoleConfig: true,
        });
        await act(async () => {
          testBed = await setup({ appServicesContext: { cloud: { isCloudEnabled: true } } });
        });
        const { actions, component, exists, find } = testBed;

        component.update();
        await actions.warm.enable(true);
        expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();

        // Assert that custom and 'none' options exist
        await actions.warm.openNodeAttributesSection();
        expect(exists('defaultDataAllocationOption')).toBeFalsy();
        expect(exists('customDataAllocationOption')).toBeTruthy();
        expect(exists('noneDataAllocationOption')).toBeTruthy();
        // Show the call-to-action for users to migrate their cluster to use node roles
        expect(find('cloudDataTierCallout').exists()).toBeTruthy();
      });
    });

    describe('using node role config', () => {
      test('shows recommended, custom and "off" options on cloud with data roles', async () => {
        httpRequestsMockHelpers.setListNodes({
          nodesByAttributes: { test: ['123'] },
          nodesByRoles: { data: ['test'], data_hot: ['test'], data_warm: ['test'] },
          isUsingDeprecatedDataRoleConfig: false,
        });
        await act(async () => {
          testBed = await setup({ appServicesContext: { cloud: { isCloudEnabled: true } } });
        });
        testBed.component.update();

        const { actions, component, exists, find } = testBed;
        await actions.warm.enable(true);
        expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();

        await actions.warm.openNodeAttributesSection();
        expect(exists('defaultDataAllocationOption')).toBeTruthy();
        expect(exists('customDataAllocationOption')).toBeTruthy();
        expect(exists('noneDataAllocationOption')).toBeTruthy();
        // Do not show the call-to-action for users to migrate their cluster to use node roles
        expect(find('cloudDataTierCallout').exists()).toBeFalsy();
      });

      test('do not show node allocation specific warnings on cloud', async () => {
        httpRequestsMockHelpers.setListNodes({
          nodesByAttributes: { test: ['123'] },
          // No nodes with node roles like "data_hot" or "data_warm"
          nodesByRoles: {},
          isUsingDeprecatedDataRoleConfig: false,
        });
        await act(async () => {
          testBed = await setup({ appServicesContext: { cloud: { isCloudEnabled: true } } });
        });
        testBed.component.update();

        const { actions, component, exists } = testBed;
        await actions.warm.enable(true);
        await actions.cold.enable(true);
        expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();

        expect(exists('cloudDataTierCallout')).toBeFalsy();
        expect(
          actions.warm.hasWillUseFallbackTierNotice() || actions.cold.hasWillUseFallbackTierNotice()
        ).toBeFalsy();
        expect(
          actions.warm.hasNoTiersAvailableNotice() || actions.cold.hasNoTiersAvailableNotice()
        ).toBeFalsy();
      });
    });
  });

  describe('data allocation', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadPolicies([POLICY_WITH_MIGRATE_OFF]);
      httpRequestsMockHelpers.setListNodes({
        nodesByRoles: {},
        nodesByAttributes: { test: ['123'] },
        isUsingDeprecatedDataRoleConfig: false,
      });
      httpRequestsMockHelpers.setLoadSnapshotPolicies([]);

      await act(async () => {
        testBed = await setup();
      });

      const { component } = testBed;
      component.update();
    });

    test('setting node_attr based allocation, but not selecting node attribute', async () => {
      const { actions } = testBed;
      await actions.warm.setDataAllocation('node_attrs');
      await actions.savePolicy();
      const latestRequest = server.requests[server.requests.length - 1];
      const warmPhase = JSON.parse(JSON.parse(latestRequest.requestBody).body).phases.warm;

      expect(warmPhase.actions.migrate).toEqual({ enabled: false });
    });

    describe('node roles', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadPolicies([POLICY_WITH_NODE_ROLE_ALLOCATION]);
        httpRequestsMockHelpers.setListNodes({
          isUsingDeprecatedDataRoleConfig: false,
          nodesByAttributes: { test: ['123'] },
          nodesByRoles: { data: ['123'] },
        });

        await act(async () => {
          testBed = await setup();
        });

        const { component } = testBed;
        component.update();
      });

      test('detecting use of the recommended allocation type', () => {
        const { find } = testBed;
        const selectedDataAllocation = find(
          'warm-dataTierAllocationControls.dataTierSelect'
        ).text();
        expect(selectedDataAllocation).toBe('Use warm nodes (recommended)');
      });

      test('setting replicas serialization', async () => {
        const { actions } = testBed;
        await actions.warm.setReplicas('123');
        await actions.savePolicy();
        const latestRequest = server.requests[server.requests.length - 1];
        const warmPhaseActions = JSON.parse(JSON.parse(latestRequest.requestBody).body).phases.warm
          .actions;
        expect(warmPhaseActions).toMatchInlineSnapshot(`
          Object {
            "allocate": Object {
              "number_of_replicas": 123,
            },
          }
        `);
      });
    });

    describe('node attr and none', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadPolicies([POLICY_WITH_NODE_ATTR_AND_OFF_ALLOCATION]);
        httpRequestsMockHelpers.setListNodes({
          isUsingDeprecatedDataRoleConfig: false,
          nodesByAttributes: { test: ['123'] },
          nodesByRoles: { data: ['123'] },
        });

        await act(async () => {
          testBed = await setup();
        });

        const { component } = testBed;
        component.update();
      });

      test('detecting use of the custom allocation type', () => {
        const { find } = testBed;
        expect(find('warm-dataTierAllocationControls.dataTierSelect').text()).toBe('Custom');
      });

      test('detecting use of the "off" allocation type', () => {
        const { find } = testBed;
        expect(find('cold-dataTierAllocationControls.dataTierSelect').text()).toContain('Off');
      });
    });
  });
});
