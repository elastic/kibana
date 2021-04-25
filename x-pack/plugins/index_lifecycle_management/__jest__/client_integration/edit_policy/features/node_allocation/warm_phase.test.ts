/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setupEnvironment } from '../../../helpers/setup_environment';
import { NodeAllocationTestBed, setupWarmPhaseNodeAllocation } from './warm_phase.helpers';

describe('<EditPolicy /> node allocation in the warm phase', () => {
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
      testBed = await setupWarmPhaseNodeAllocation();
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

  test('shows spinner for node attributes input when loading', async () => {
    server.respondImmediately = false;

    const { actions, component } = testBed;
    await actions.enable(true);

    expect(component.find('.euiLoadingSpinner').exists()).toBeTruthy();
    expect(actions.hasDataTierAllocationControls()).toBeTruthy();

    expect(component.find('.euiCallOut--warning').exists()).toBeFalsy();
    expect(actions.hasNodeAttributesSelect()).toBeFalsy();
  });

  test('offers DATA TIER allocation guidance when no attributes exist and data tiers are available', async () => {
    httpRequestsMockHelpers.setListNodes({
      nodesByAttributes: {},
      nodesByRoles: { data: ['node1'] },
      isUsingDeprecatedDataRoleConfig: false,
    });

    await setup();
    const { actions, component } = testBed;

    component.update();
    await actions.enable(true);

    expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();
    await actions.setDataAllocation('node_attrs');
    expect(actions.hasDefaultToDataTiersNotice()).toBeTruthy();
    expect(actions.hasNodeAttributesSelect()).toBeFalsy();
  });

  test('offers DATA TIER FALLBACK allocation guidance when no attributes exist and data tiers are available, but not for the warm phase', async () => {
    httpRequestsMockHelpers.setListNodes({
      nodesByAttributes: {},
      nodesByRoles: { data_hot: ['node1'] },
      isUsingDeprecatedDataRoleConfig: false,
    });

    await setup();
    const { actions, component } = testBed;

    component.update();
    await actions.enable(true);

    expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();
    await actions.setDataAllocation('node_attrs');
    expect(actions.hasWillUseFallbackTierNotice()).toBeTruthy();
    expect(actions.hasNodeAttributesSelect()).toBeFalsy();
  });

  test('offers DATA NODE allocation guidance when no attributes exist and data nodes are in use', async () => {
    httpRequestsMockHelpers.setListNodes({
      nodesByAttributes: {},
      nodesByRoles: {},
      isUsingDeprecatedDataRoleConfig: true,
    });

    await setup();
    const { actions, component } = testBed;

    component.update();
    await actions.enable(true);

    expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();
    await actions.setDataAllocation('node_attrs');
    expect(actions.hasDefaultToDataNodesNotice()).toBeTruthy();
    expect(actions.hasNodeAttributesSelect()).toBeFalsy();
  });

  test('shows node attributes input when attributes exist', async () => {
    const { actions, component } = testBed;
    await actions.enable(true);

    expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();
    await actions.setDataAllocation('node_attrs');
    expect(actions.hasDefaultAllocationBehaviorNotice()).toBeFalsy();
    expect(actions.hasNodeAttributesSelect()).toBeTruthy();
    expect(actions.getNodeAttributesSelectOptions().length).toBe(2);
  });

  test('shows view node attributes link when an attribute is selected and shows flyout when clicked', async () => {
    const { actions, component } = testBed;
    await actions.enable(true);

    expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();
    await actions.setDataAllocation('node_attrs');
    expect(actions.hasDefaultAllocationBehaviorNotice()).toBeFalsy();
    expect(actions.hasNodeAttributesSelect()).toBeTruthy();

    expect(actions.hasNodeDetailsFlyout()).toBeFalsy();
    expect(actions.getNodeAttributesSelectOptions().length).toBe(2);
    await actions.setSelectedNodeAttribute('attribute:true');

    await actions.openNodeDetailsFlyout();
    expect(actions.hasNodeDetailsFlyout()).toBeTruthy();
  });

  test('offers allocation guidance when no node roles are found', async () => {
    httpRequestsMockHelpers.setListNodes({
      nodesByAttributes: {},
      nodesByRoles: {},
      isUsingDeprecatedDataRoleConfig: false,
    });

    await setup();
    const { actions, component } = testBed;

    component.update();
    await actions.enable(true);

    expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();
    expect(actions.hasNoTiersAvailableNotice()).toBeTruthy();
  });

  test('in the warm phase, offers allocation guidance when allocation will fallback to the hot tier', async () => {
    httpRequestsMockHelpers.setListNodes({
      nodesByAttributes: {},
      nodesByRoles: { data_hot: ['test'], data_cold: ['test'] },
      isUsingDeprecatedDataRoleConfig: false,
    });

    await setup();
    const { actions, component } = testBed;

    component.update();
    await actions.enable(true);

    expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();
    expect(actions.hasWillUseFallbackTierNotice()).toBeTruthy();
  });

  test(`doesn't offer allocation guidance when node with "data" role exists`, async () => {
    httpRequestsMockHelpers.setListNodes({
      nodesByAttributes: {},
      nodesByRoles: { data: ['test'] },
      isUsingDeprecatedDataRoleConfig: false,
    });
    await setup();
    const { actions, component } = testBed;

    component.update();
    await actions.enable(true);

    expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();
    expect(actions.hasDefaultAllocationBehaviorNotice()).toBeFalsy();
  });
});
