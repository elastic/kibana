/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback } from 'react';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { EuiPanel } from '@elastic/eui';
import { RightPanelKey } from '../right';
import { useBasicDataFromDetailsData } from '../../../timelines/components/side_panel/event_details/helpers';
import { EndpointIsolateSuccess } from '../../../common/components/endpoint/host_isolation';
import { useHostIsolationTools } from '../../../timelines/components/side_panel/event_details/use_host_isolation_tools';
import { useIsolateHostPanelContext } from './context';
import { HostIsolationPanel } from '../../../detections/components/host_isolation';

/**
 * Document details expandable flyout section content for the isolate host component, displaying the form or the success banner
 */
export const PanelContent: FC = () => {
  const { openRightPanel } = useExpandableFlyoutContext();
  const { dataFormattedForFieldBrowser, eventId, scopeId, indexName, isolateAction } =
    useIsolateHostPanelContext();

  const { isIsolateActionSuccessBannerVisible, handleIsolationActionSuccess } =
    useHostIsolationTools();

  const { alertId, hostName } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);

  const showAlertDetails = useCallback(
    () =>
      openRightPanel({
        id: RightPanelKey,
        params: {
          id: eventId,
          indexName,
          scopeId,
        },
      }),
    [eventId, indexName, scopeId, openRightPanel]
  );

  return (
    <EuiPanel hasShadow={false} hasBorder={false}>
      {isIsolateActionSuccessBannerVisible && (
        <EndpointIsolateSuccess
          hostName={hostName}
          alertId={alertId}
          isolateAction={isolateAction}
        />
      )}
      <HostIsolationPanel
        details={dataFormattedForFieldBrowser}
        cancelCallback={showAlertDetails}
        successCallback={handleIsolationActionSuccess}
        isolateAction={isolateAction}
      />
    </EuiPanel>
  );
};
