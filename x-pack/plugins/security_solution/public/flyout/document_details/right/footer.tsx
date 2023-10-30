/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback } from 'react';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { FlyoutFooter } from '../../../timelines/components/side_panel/event_details/flyout';
import { useRightPanelContext } from './context';
import { useHostIsolationTools } from '../../../timelines/components/side_panel/event_details/use_host_isolation_tools';

/**
 *
 */
export const PanelFooter: FC = () => {
  const { closeFlyout, openRightPanel } = useExpandableFlyoutContext();
  const {
    eventId,
    indexName,
    dataFormattedForFieldBrowser,
    dataAsNestedObject,
    refetchFlyoutData,
    scopeId,
  } = useRightPanelContext();

  const { isHostIsolationPanelOpen, showHostIsolationPanel } = useHostIsolationTools();

  const showHostIsolationPanelCallback = useCallback(
    (action: 'isolateHost' | 'unisolateHost' | undefined) => {
      showHostIsolationPanel(action);
      openRightPanel({
        id: 'document-details-isolate-host',
        params: {
          id: eventId,
          indexName,
          scopeId,
          isolateAction: action,
        },
      });
    },
    [eventId, indexName, openRightPanel, scopeId, showHostIsolationPanel]
  );

  return (
    <FlyoutFooter
      detailsData={dataFormattedForFieldBrowser}
      detailsEcsData={dataAsNestedObject}
      handleOnEventClosed={closeFlyout}
      isHostIsolationPanelOpen={isHostIsolationPanelOpen}
      isReadOnly={false}
      loadingEventDetails={false}
      onAddIsolationStatusClick={showHostIsolationPanelCallback}
      scopeId={scopeId}
      refetchFlyoutData={refetchFlyoutData}
    />
  );
};
