/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { FlyoutFooter } from '../../timelines/components/side_panel/event_details/flyout';
import { useRightPanelContext } from './context';
import { useHostIsolationTools } from '../../timelines/components/side_panel/event_details/use_host_isolation_tools';

/**
 *
 */
export const PanelFooter: FC = memo(() => {
  const { closeFlyout } = useExpandableFlyoutContext();
  const { dataFormattedForFieldBrowser, dataAsNestedObject, refetchFlyoutData, scopeId } =
    useRightPanelContext();

  const { isHostIsolationPanelOpen, showHostIsolationPanel } = useHostIsolationTools();

  if (!dataFormattedForFieldBrowser || !dataAsNestedObject) {
    return null;
  }

  return (
    <FlyoutFooter
      detailsData={dataFormattedForFieldBrowser}
      detailsEcsData={dataAsNestedObject}
      handleOnEventClosed={closeFlyout}
      isHostIsolationPanelOpen={isHostIsolationPanelOpen}
      isReadOnly={false}
      loadingEventDetails={false}
      onAddIsolationStatusClick={showHostIsolationPanel}
      scopeId={scopeId}
      refetchFlyoutData={refetchFlyoutData}
    />
  );
});

PanelFooter.displayName = 'PanelFooter';
