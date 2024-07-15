/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../__mocks__/shallow_useeffect.mock';
import { setMockValues, setMockActions } from '../../../../__mocks__/kea_logic';

import React from 'react';

import {
  EuiPopover,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiResizeObserver,
} from '@elastic/eui';

import { IngestionStatus, IngestionMethod } from '@kbn/search-connectors';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { Status } from '../../../../../../common/types/api';

import { SyncsContextMenu } from './syncs_context_menu';

describe('SyncsContextMenu', () => {
  const startSync = jest.fn();
  const startIncrementalSync = jest.fn();
  const startAccessControlSync = jest.fn();
  const cancelSyncs = jest.fn();

  const mockValues = {
    hasDocumentLevelSecurityFeature: false,
    hasIncrementalSyncFeature: false,
    ingestionMethod: IngestionMethod.CONNECTOR,
    ingestionStatus: IngestionStatus.CONNECTED,
    isCanceling: false,
    isSyncing: false,
    isWaitingForSync: false,
    productFeatures: {
      hasDocumentLevelSecurityEnabled: true,
      hasIncrementalSyncEnabled: true,
    },
    status: Status.SUCCESS,
    connector: {
      index_name: 'index_name',
    },
  };

  beforeEach(() => {
    setMockValues(mockValues);
    setMockActions({
      cancelSyncs,
      startAccessControlSync,
      startIncrementalSync,
      startSync,
    });
  });

  it('renders', () => {
    setMockValues({ ...mockValues, isWaitingForSync: true });
    const wrapper = mountWithIntl(<SyncsContextMenu />);
    const popover = wrapper.find(EuiPopover);

    expect(popover).toHaveLength(1);
    expect(popover.props().isOpen).toEqual(false);
  });

  it('Can cancel syncs', () => {
    setMockValues({ ...mockValues, isSyncing: true });
    const wrapper = mountWithIntl(<SyncsContextMenu />);
    const button = wrapper.find(
      'button[data-telemetry-id="entSearchContent-connector-header-sync-openSyncMenu"]'
    );
    button.simulate('click');

    const menuItems = wrapper
      .find(EuiContextMenuPanel)
      .find(EuiResizeObserver)
      .find(EuiContextMenuItem);
    expect(menuItems).toHaveLength(1);

    const lastButton = menuItems.last();

    expect(lastButton.prop('disabled')).toEqual(false);
    expect(lastButton.text()).toEqual('Cancel Syncs');

    menuItems.last().simulate('click');
    expect(cancelSyncs).toHaveBeenCalled();
  });

  it('Can start a sync', () => {
    setMockValues({ ...mockValues, ingestionStatus: IngestionStatus.ERROR });
    const wrapper = mountWithIntl(<SyncsContextMenu />);
    const button = wrapper.find(
      'button[data-telemetry-id="entSearchContent-connector-header-sync-openSyncMenu"]'
    );
    button.simulate('click');

    const menuItems = wrapper
      .find(EuiContextMenuPanel)
      .find(EuiResizeObserver)
      .find(EuiContextMenuItem);
    expect(menuItems).toHaveLength(2);

    const firstButton = menuItems.get(0);

    expect(firstButton.props).toEqual(
      expect.objectContaining({
        children: 'Full Content',
        disabled: false,
      })
    );
    menuItems.at(0).simulate('click');
    expect(startSync).toHaveBeenCalled();
  });

  it('Cannot start a sync without an index name', () => {
    setMockValues({ ...mockValues, connector: { index_name: null } });
    const wrapper = mountWithIntl(<SyncsContextMenu />);
    const button = wrapper.find(
      'button[data-telemetry-id="entSearchContent-connector-header-sync-openSyncMenu"]'
    );
    button.simulate('click');

    const menuItems = wrapper
      .find(EuiContextMenuPanel)
      .find(EuiResizeObserver)
      .find(EuiContextMenuItem);
    expect(menuItems).toHaveLength(2);

    const firstButton = menuItems.get(0);

    expect(firstButton.props).toEqual(
      expect.objectContaining({
        children: 'Full Content',
        disabled: true,
      })
    );
  });
});
