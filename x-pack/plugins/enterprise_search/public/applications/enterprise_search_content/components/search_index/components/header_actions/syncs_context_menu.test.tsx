/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../../__mocks__/shallow_useeffect.mock';
import { setMockValues, setMockActions } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiPopover, EuiButtonEmpty } from '@elastic/eui';

import { Status } from '../../../../../../../common/types/api';

import { IngestionMethod, IngestionStatus } from '../../../../types';

import { SyncsContextMenu } from './syncs_context_menu';

describe('SyncsContextMenu', () => {
  const startSync = jest.fn();
  const cancelSyncs = jest.fn();

  const mockValues = {
    ingestionMethod: IngestionMethod.CONNECTOR,
    ingestionStatus: IngestionStatus.CONNECTED,
    isCanceling: false,
    isSyncing: false,
    isWaitingForSync: false,
    status: Status.SUCCESS,
  };

  beforeEach(() => {
    setMockValues(mockValues);
    setMockActions({
      cancelSyncs,
      startSync,
    });
  });

  it('renders', () => {
    const wrapper = shallow(<SyncsContextMenu />);
    const popover = wrapper.find(EuiPopover);
    const buttons = wrapper.find(EuiButtonEmpty);
    const firstButton = buttons.get(0);
    const secondButton = buttons.get(1);

    expect(popover).toHaveLength(1);
    expect(popover.props().isOpen).toEqual(false);
    expect(buttons).toHaveLength(2);
    expect(firstButton.props).toEqual(
      expect.objectContaining({
        children: 'Sync',
        disabled: false,
        isLoading: false,
      })
    );
    expect(secondButton.props).toEqual(
      expect.objectContaining({
        children: 'Cancel syncs',
        disabled: true,
        isLoading: false,
      })
    );
  });
  it('renders correctly for a connector waiting for sync', () => {
    setMockValues({ ...mockValues, isWaitingForSync: true });
    const wrapper = shallow(<SyncsContextMenu />);
    const popover = wrapper.find(EuiPopover);
    const buttons = wrapper.find(EuiButtonEmpty);
    const firstButton = buttons.get(0);
    const secondButton = buttons.get(1);

    expect(popover).toHaveLength(1);
    expect(buttons).toHaveLength(2);
    expect(firstButton.props).toEqual(
      expect.objectContaining({
        children: 'Waiting for sync',
        disabled: false,
        isLoading: true,
      })
    );
    expect(secondButton.props).toEqual(
      expect.objectContaining({
        disabled: false,
        isLoading: false,
      })
    );
  });
  it('renders correctly for a connector with an in progress sync', () => {
    setMockValues({ ...mockValues, isSyncing: true });
    const wrapper = shallow(<SyncsContextMenu />);
    const popover = wrapper.find(EuiPopover);
    const buttons = wrapper.find(EuiButtonEmpty);
    const firstButton = buttons.get(0);
    const secondButton = buttons.get(1);

    expect(popover).toHaveLength(1);
    expect(buttons).toHaveLength(2);
    expect(firstButton.props).toEqual(
      expect.objectContaining({
        children: 'Syncing',
        disabled: false,
        isLoading: true,
      })
    );
    expect(secondButton.props).toEqual(
      expect.objectContaining({
        disabled: false,
        isLoading: false,
      })
    );
  });
  it('renders correctly for an incomplete connector', () => {
    setMockValues({ ...mockValues, ingestionStatus: IngestionStatus.INCOMPLETE });
    const wrapper = shallow(<SyncsContextMenu />);
    const popover = wrapper.find(EuiPopover);
    const buttons = wrapper.find(EuiButtonEmpty);
    const firstButton = buttons.get(0);
    const secondButton = buttons.get(1);

    expect(popover).toHaveLength(1);
    expect(buttons).toHaveLength(2);
    expect(firstButton.props).toEqual(
      expect.objectContaining({
        children: 'Sync',
        disabled: true,
        isLoading: false,
      })
    );
    expect(secondButton.props).toEqual(
      expect.objectContaining({
        disabled: true,
        isLoading: false,
      })
    );
  });
  it('renders correctly for a loading cancellation', () => {
    setMockValues({ ...mockValues, isSyncing: true, status: Status.LOADING });
    const wrapper = shallow(<SyncsContextMenu />);
    const popover = wrapper.find(EuiPopover);
    const buttons = wrapper.find(EuiButtonEmpty);
    const firstButton = buttons.get(0);
    const secondButton = buttons.get(1);

    expect(popover).toHaveLength(1);

    expect(buttons).toHaveLength(2);
    expect(firstButton.props).toEqual(
      expect.objectContaining({
        children: 'Syncing',
        disabled: false,
        isLoading: true,
      })
    );
    expect(secondButton.props).toEqual(
      expect.objectContaining({
        disabled: false,
        isLoading: true,
      })
    );
  });
  it('calls startSync on clicking sync', () => {
    setMockValues({ ...mockValues });
    const wrapper = shallow(<SyncsContextMenu />);
    const buttons = wrapper.find(EuiButtonEmpty);
    buttons.first().simulate('click');
    expect(startSync).toHaveBeenCalled();
  });
  it('calls cancelSync on clicking cancel sync', () => {
    setMockValues({ ...mockValues, isSyncing: true });
    const wrapper = shallow(<SyncsContextMenu />);
    const buttons = wrapper.find(EuiButtonEmpty);
    buttons.last().simulate('click');
    expect(cancelSyncs).toHaveBeenCalled();
  });
});
