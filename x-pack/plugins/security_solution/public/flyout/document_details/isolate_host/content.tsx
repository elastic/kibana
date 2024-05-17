/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { FC } from 'react';
import React, { useCallback } from 'react';
import { EndpointIsolateSuccess } from '../../../common/components/endpoint/host_isolation';
import { HostIsolationPanel } from '../../../detections/components/host_isolation';
import { useBasicDataFromDetailsData } from '../../../timelines/components/side_panel/event_details/helpers';
import { useHostIsolationTools } from '../../../timelines/components/side_panel/event_details/use_host_isolation_tools';
import { FlyoutBody } from '../../shared/components/flyout_body';
import { DocumentDetailsRightPanelKey } from '../shared/constants/panel_keys';
import { useIsolateHostPanelContext } from './context';

/**
 * Document details expandable flyout section content for the isolate host component, displaying the form or the success banner
 */
export const PanelContent: FC = () => {
  const { openRightPanel } = useExpandableFlyoutApi();
  const { dataFormattedForFieldBrowser, eventId, scopeId, indexName, isolateAction } =
    useIsolateHostPanelContext();

  const { isIsolateActionSuccessBannerVisible, handleIsolationActionSuccess } =
    useHostIsolationTools();

  const { alertId, hostName } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);

  const showAlertDetails = useCallback(
    () =>
      openRightPanel({
        id: DocumentDetailsRightPanelKey,
        params: {
          id: eventId,
          indexName,
          scopeId,
        },
      }),
    [eventId, indexName, scopeId, openRightPanel]
  );

  return (
    <FlyoutBody>
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
    </FlyoutBody>
  );
};
