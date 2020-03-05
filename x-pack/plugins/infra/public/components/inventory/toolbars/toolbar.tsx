/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiFlexItem } from '@elastic/eui';
import {
  SnapshotMetricInput,
  SnapshotGroupBy,
  SnapshotCustomMetricInput,
} from '../../../../common/http_api/snapshot_api';
import { InventoryCloudAccount } from '../../../../common/http_api/inventory_meta_api';
import { findToolbar } from '../../../../common/inventory_models/toolbars';
import { ToolbarWrapper } from './toolbar_wrapper';

import { InfraGroupByOptions } from '../../../lib/lib';
import { WithWaffleViewState } from '../../../containers/waffle/with_waffle_view_state';
import { SavedViewsToolbarControls } from '../../saved_views/toolbar_control';
import { inventoryViewSavedObjectType } from '../../../../common/saved_objects/inventory_view';
import { IIndexPattern } from '../../../../../../../src/plugins/data/public';
import { InventoryItemType } from '../../../../common/inventory_models/types';
import { WaffleOptionsState } from '../../../pages/inventory_view/hooks/use_waffle_options';

export interface ToolbarProps
  extends Omit<WaffleOptionsState, 'view' | 'boundsOverride' | 'autoBounds'> {
  createDerivedIndexPattern: (type: 'logs' | 'metrics' | 'both') => IIndexPattern;
  changeMetric: (payload: SnapshotMetricInput) => void;
  changeGroupBy: (payload: SnapshotGroupBy) => void;
  changeCustomOptions: (payload: InfraGroupByOptions[]) => void;
  changeAccount: (id: string) => void;
  changeRegion: (name: string) => void;
  accounts: InventoryCloudAccount[];
  regions: string[];
  changeCustomMetrics: (payload: SnapshotCustomMetricInput[]) => void;
}

const wrapToolbarItems = (
  ToolbarItems: FunctionComponent<ToolbarProps>,
  accounts: InventoryCloudAccount[],
  regions: string[]
) => {
  return (
    <ToolbarWrapper>
      {props => (
        <>
          <ToolbarItems {...props} accounts={accounts} regions={regions} />
          <EuiFlexItem grow={true} />
          <EuiFlexItem grow={false}>
            <WithWaffleViewState indexPattern={props.createDerivedIndexPattern('metrics')}>
              {({ defaultViewState, viewState, onViewChange }) => (
                <SavedViewsToolbarControls
                  defaultViewState={defaultViewState}
                  viewState={viewState}
                  onViewChange={onViewChange}
                  viewType={inventoryViewSavedObjectType}
                />
              )}
            </WithWaffleViewState>
          </EuiFlexItem>
        </>
      )}
    </ToolbarWrapper>
  );
};

interface Props {
  nodeType: InventoryItemType;
  regions: string[];
  accounts: InventoryCloudAccount[];
}
export const Toolbar = ({ nodeType, accounts, regions }: Props) => {
  const ToolbarItems = findToolbar(nodeType);
  return wrapToolbarItems(ToolbarItems, accounts, regions);
};
