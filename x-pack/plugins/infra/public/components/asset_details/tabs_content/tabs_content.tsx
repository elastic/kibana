/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { type AssetDetailsProps, type TabIds, FlyoutTabIds } from '../asset_details';
import Metadata from '../metadata/metadata';
import { Processes } from '../processes/processes';

export const AssetDetailsTabContent = ({
  renderedTabsSet,
  hostFlyoutOpen,
  currentTimeRange,
  node,
  nodeType,
  showActionsColumn,
  setHostFlyoutState,
  selectedTabId,
}: Pick<
  AssetDetailsProps,
  | 'renderedTabsSet'
  | 'hostFlyoutOpen'
  | 'currentTimeRange'
  | 'node'
  | 'nodeType'
  | 'showActionsColumn'
  | 'setHostFlyoutState'
> & { selectedTabId: TabIds }) => {
  const persistMetadataSearchToUrlState =
    setHostFlyoutState && hostFlyoutOpen
      ? {
          metadataSearchUrlState: hostFlyoutOpen.metadataSearch,
          setMetadataSearchUrlState: setHostFlyoutState,
        }
      : undefined;

  const isTabSelected = (flyoutTabId: FlyoutTabIds) => {
    return selectedTabId === flyoutTabId;
  };

  return (
    <>
      {renderedTabsSet.current.has(FlyoutTabIds.METADATA) && (
        <div hidden={!isTabSelected(FlyoutTabIds.METADATA)}>
          <Metadata
            currentTimeRange={currentTimeRange}
            node={node}
            nodeType={nodeType}
            showActionsColumn={showActionsColumn}
            persistMetadataSearchToUrlState={persistMetadataSearchToUrlState}
          />
        </div>
      )}
      {renderedTabsSet.current.has(FlyoutTabIds.PROCESSES) && (
        <div hidden={!isTabSelected(FlyoutTabIds.PROCESSES)}>
          <Processes
            node={node}
            nodeType={nodeType}
            currentTime={currentTimeRange.to}
            searchFilter={hostFlyoutOpen?.searchFilter}
            setSearchFilter={setHostFlyoutState}
          />
        </div>
      )}
    </>
  );
};
