/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { TestBed } from '@kbn/test-jest-helpers';

import { DataTierAllocationType } from '../../../../public/application/sections/edit_policy/types';
import { Phase } from '../../../../common/types';
import { createFormSetValueAction } from './form_set_value_action';

export const createNodeAllocationActions = (testBed: TestBed, phase: Phase) => {
  const { component, find, exists } = testBed;

  const controlsSelector = `${phase}-dataTierAllocationControls`;
  const dataTierSelector = `${controlsSelector}.dataTierSelect`;
  const nodeAttrsSelector = `${phase}-selectedNodeAttrs`;

  const openNodeAttributesSection = async () => {
    await act(async () => {
      find(dataTierSelector).simulate('click');
    });
    component.update();
  };

  const isAllocationLoading = () => find(`${phase}-phase.allocationLoadingSpinner`).exists();
  const hasDefaultToDataNodesNotice = () => exists(`${phase}-phase.defaultToDataNodesNotice`);
  const hasDefaultToDataTiersNotice = () => exists(`${phase}-phase.defaultToDataTiersNotice`);
  const hasDefaultAllocationBehaviorNotice = () =>
    hasDefaultToDataNodesNotice() && hasDefaultToDataTiersNotice();
  const hasNoTiersAvailableNotice = () => exists(`${phase}-phase.noTiersAvailableNotice`);
  const hasNoTiersAvailableUsingNodeAttributesNotice = () =>
    exists(`${phase}-phase.noTiersAvailableUsingNodeAttributesNotice`);
  const hasWillUseFallbackTierNotice = () => exists(`${phase}-phase.willUseFallbackTierNotice`);
  const hasWillUseFallbackTierUsingNodeAttributesNotice = () =>
    exists(`${phase}-phase.willUseFallbackTierUsingNodeAttributesNotice`);
  const getWillUseFallbackTierNoticeText = () =>
    find(`${phase}-phase.willUseFallbackTierNotice`).text();

  return {
    hasDataTierAllocationControls: () => exists(controlsSelector),
    openNodeAttributesSection,
    hasNodeAttributesSelect: (): boolean => exists(nodeAttrsSelector),
    getNodeAttributesSelectOptions: () => find(nodeAttrsSelector).find('option'),
    setDataAllocation: async (value: DataTierAllocationType) => {
      await openNodeAttributesSection();

      await act(async () => {
        switch (value) {
          case 'node_roles':
            find(`${controlsSelector}.defaultDataAllocationOption`).simulate('click');
            break;
          case 'node_attrs':
            find(`${controlsSelector}.customDataAllocationOption`).simulate('click');
            break;
          default:
            find(`${controlsSelector}.noneDataAllocationOption`).simulate('click');
        }
      });
      component.update();
    },
    setSelectedNodeAttribute: createFormSetValueAction(testBed, nodeAttrsSelector),
    isAllocationLoading,
    hasDefaultToDataNodesNotice,
    hasDefaultToDataTiersNotice,
    hasDefaultAllocationBehaviorNotice,
    hasNoTiersAvailableNotice,
    hasNoTiersAvailableUsingNodeAttributesNotice,
    hasWillUseFallbackTierNotice,
    hasWillUseFallbackTierUsingNodeAttributesNotice,
    getWillUseFallbackTierNoticeText,
    hasNodeDetailsFlyout: () => exists(`${phase}-viewNodeDetailsFlyoutButton`),
    openNodeDetailsFlyout: async () => {
      await act(async () => {
        find(`${phase}-viewNodeDetailsFlyoutButton`).simulate('click');
      });
      component.update();
    },
  };
};
