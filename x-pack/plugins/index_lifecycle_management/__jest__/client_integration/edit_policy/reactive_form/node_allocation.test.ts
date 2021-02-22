/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setupEnvironment } from '../../helpers/setup_environment';
import { EditPolicyTestBed, setup } from '../edit_policy.helpers';

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

    test('shows warning instead of node attributes input when none exist', async () => {
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
      expect(actions.warm.hasNoNodeAttrsWarning()).toBeTruthy();
      expect(actions.warm.hasNodeAttributesSelect()).toBeFalsy();
    });

    test('shows node attributes input when attributes exist', async () => {
      const { actions, component } = testBed;
      await actions.warm.enable(true);

      expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();
      await actions.warm.setDataAllocation('node_attrs');
      expect(actions.warm.hasNoNodeAttrsWarning()).toBeFalsy();
      expect(actions.warm.hasNodeAttributesSelect()).toBeTruthy();
      expect(actions.warm.getNodeAttributesSelectOptions().length).toBe(2);
    });

    test('shows view node attributes link when attribute selected and shows flyout when clicked', async () => {
      const { actions, component } = testBed;
      await actions.warm.enable(true);

      expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();
      await actions.warm.setDataAllocation('node_attrs');
      expect(actions.warm.hasNoNodeAttrsWarning()).toBeFalsy();
      expect(actions.warm.hasNodeAttributesSelect()).toBeTruthy();

      expect(actions.warm.hasNodeDetailsFlyout()).toBeFalsy();
      expect(actions.warm.getNodeAttributesSelectOptions().length).toBe(2);
      await actions.warm.setSelectedNodeAttribute('attribute:true');

      await actions.warm.openNodeDetailsFlyout();
      expect(actions.warm.hasNodeDetailsFlyout()).toBeTruthy();
    });

    test('shows default allocation warning when no node roles are found', async () => {
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
      expect(actions.warm.hasDefaultAllocationWarning()).toBeTruthy();
    });

    test('shows default allocation notice when hot tier exists, but not warm tier', async () => {
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
      expect(actions.warm.hasDefaultAllocationNotice()).toBeTruthy();
    });

    test(`doesn't show default allocation notice when node with "data" role exists`, async () => {
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
      expect(actions.warm.hasDefaultAllocationNotice()).toBeFalsy();
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

    test('shows warning instead of node attributes input when none exist', async () => {
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
      expect(actions.cold.hasNoNodeAttrsWarning()).toBeTruthy();
      expect(actions.cold.hasNodeAttributesSelect()).toBeFalsy();
    });

    test('shows node attributes input when attributes exist', async () => {
      const { actions, component } = testBed;
      await actions.cold.enable(true);

      expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();
      await actions.cold.setDataAllocation('node_attrs');
      expect(actions.cold.hasNoNodeAttrsWarning()).toBeFalsy();
      expect(actions.cold.hasNodeAttributesSelect()).toBeTruthy();
      expect(actions.cold.getNodeAttributesSelectOptions().length).toBe(2);
    });

    test('shows view node attributes link when attribute selected and shows flyout when clicked', async () => {
      const { actions, component } = testBed;
      await actions.cold.enable(true);

      expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();
      await actions.cold.setDataAllocation('node_attrs');
      expect(actions.cold.hasNoNodeAttrsWarning()).toBeFalsy();
      expect(actions.cold.hasNodeAttributesSelect()).toBeTruthy();

      expect(actions.cold.hasNodeDetailsFlyout()).toBeFalsy();
      expect(actions.cold.getNodeAttributesSelectOptions().length).toBe(2);
      await actions.cold.setSelectedNodeAttribute('attribute:true');

      await actions.cold.openNodeDetailsFlyout();
      expect(actions.cold.hasNodeDetailsFlyout()).toBeTruthy();
    });

    test('shows default allocation warning when no node roles are found', async () => {
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
      expect(actions.cold.hasDefaultAllocationWarning()).toBeTruthy();
    });

    test('shows default allocation notice when warm or hot tiers exists, but not cold tier', async () => {
      httpRequestsMockHelpers.setListNodes({
        nodesByAttributes: {},
        nodesByRoles: { data_hot: ['test'], data_warm: ['test'] },
        isUsingDeprecatedDataRoleConfig: false,
      });

      await act(async () => {
        testBed = await setup();
      });
      const { actions, component } = testBed;

      component.update();
      await actions.cold.enable(true);

      expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();
      expect(actions.cold.hasDefaultAllocationNotice()).toBeTruthy();
    });

    test(`doesn't show default allocation notice when node with "data" role exists`, async () => {
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
      expect(actions.cold.hasDefaultAllocationNotice()).toBeFalsy();
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
    describe('with deprecated data role config', () => {
      test('should hide data tier option on cloud using legacy node role configuration', async () => {
        httpRequestsMockHelpers.setListNodes({
          nodesByAttributes: { test: ['123'] },
          // On cloud, if using legacy config there will not be any "data_*" roles set.
          nodesByRoles: { data: ['test'] },
          isUsingDeprecatedDataRoleConfig: true,
        });
        await act(async () => {
          testBed = await setup({ appServicesContext: { cloud: { isCloudEnabled: true } } });
        });
        const { actions, component, exists } = testBed;

        component.update();
        await actions.warm.enable(true);
        expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();

        // Assert that custom and 'none' options exist
        await actions.warm.openNodeAttributesSection();
        expect(exists('defaultDataAllocationOption')).toBeFalsy();
        expect(exists('customDataAllocationOption')).toBeTruthy();
        expect(exists('noneDataAllocationOption')).toBeTruthy();
      });
    });

    describe('with node role config', () => {
      test('shows off, custom and data role options on cloud with data roles', async () => {
        httpRequestsMockHelpers.setListNodes({
          nodesByAttributes: { test: ['123'] },
          nodesByRoles: { data: ['test'], data_hot: ['test'], data_warm: ['test'] },
          isUsingDeprecatedDataRoleConfig: false,
        });
        await act(async () => {
          testBed = await setup({ appServicesContext: { cloud: { isCloudEnabled: true } } });
        });
        const { actions, component, exists } = testBed;

        component.update();
        await actions.warm.enable(true);
        expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();

        await actions.warm.openNodeAttributesSection();
        expect(exists('defaultDataAllocationOption')).toBeTruthy();
        expect(exists('customDataAllocationOption')).toBeTruthy();
        expect(exists('noneDataAllocationOption')).toBeTruthy();
        // We should not be showing the call-to-action for users to activate data tiers in cloud
        expect(exists('cloudDataTierCallout')).toBeFalsy();
      });

      test('shows cloud notice when cold tier nodes do not exist', async () => {
        httpRequestsMockHelpers.setListNodes({
          nodesByAttributes: {},
          nodesByRoles: { data: ['test'], data_hot: ['test'], data_warm: ['test'] },
          isUsingDeprecatedDataRoleConfig: false,
        });
        await act(async () => {
          testBed = await setup({ appServicesContext: { cloud: { isCloudEnabled: true } } });
        });
        const { actions, component, exists } = testBed;

        component.update();
        await actions.cold.enable(true);
        expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();

        expect(exists('cloudDataTierCallout')).toBeTruthy();
        // Assert that other notices are not showing
        expect(actions.cold.hasDefaultAllocationNotice()).toBeFalsy();
        expect(actions.cold.hasNoNodeAttrsWarning()).toBeFalsy();
      });
    });
  });
});
