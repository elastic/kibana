/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyoutBody } from '@elastic/eui';
import styled from 'styled-components';
import React from 'react';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { EndpointIsolateSuccess } from '../../../../../common/components/endpoint/host_isolation';
import { HostIsolationPanel } from '../../../../../detections/components/host_isolation';
import type {
  BrowserFields,
  TimelineEventsDetailsItem,
} from '../../../../../../common/search_strategy';
import type { HandleOnEventClosed } from '../expandable_event';
import { ExpandableEvent } from '../expandable_event';

const StyledEuiFlyoutBody = styled(EuiFlyoutBody)`
  .euiFlyoutBody__overflow {
    display: flex;
    flex: 1;
    overflow: hidden;

    .euiFlyoutBody__overflowContent {
      flex: 1;
      overflow: hidden;
      padding: ${({ theme }) => `0 ${theme.eui.euiSizeM} ${theme.eui.euiSizeM}`};
    }
  }
`;

interface FlyoutBodyComponentProps {
  alertId: string;
  browserFields: BrowserFields;
  detailsData: TimelineEventsDetailsItem[] | null;
  detailsEcsData: Ecs | null;
  event: { eventId: string; indexName: string };
  handleIsolationActionSuccess: () => void;
  handleOnEventClosed: HandleOnEventClosed;
  hostName: string;
  isAlert: boolean;
  isDraggable?: boolean;
  isReadOnly?: boolean;
  isolateAction: 'isolateHost' | 'unisolateHost';
  isIsolateActionSuccessBannerVisible: boolean;
  isHostIsolationPanelOpen: boolean;
  loading: boolean;
  rawEventData: object | undefined;
  showAlertDetails: () => void;
  scopeId: string;
}

const FlyoutBodyComponent = ({
  alertId,
  browserFields,
  detailsData,
  detailsEcsData,
  event,
  handleIsolationActionSuccess,
  handleOnEventClosed,
  hostName,
  isAlert,
  isDraggable,
  isReadOnly,
  isolateAction,
  isHostIsolationPanelOpen,
  isIsolateActionSuccessBannerVisible,
  loading,
  rawEventData,
  showAlertDetails,
  scopeId,
}: FlyoutBodyComponentProps) => {
  return (
    <StyledEuiFlyoutBody>
      {isIsolateActionSuccessBannerVisible && (
        <EndpointIsolateSuccess
          hostName={hostName}
          alertId={alertId}
          isolateAction={isolateAction}
        />
      )}
      {isHostIsolationPanelOpen ? (
        <HostIsolationPanel
          details={detailsData}
          cancelCallback={showAlertDetails}
          successCallback={handleIsolationActionSuccess}
          isolateAction={isolateAction}
        />
      ) : (
        <ExpandableEvent
          browserFields={browserFields}
          detailsData={detailsData}
          detailsEcsData={detailsEcsData}
          event={event}
          isAlert={isAlert}
          isDraggable={isDraggable}
          loading={loading}
          rawEventData={rawEventData}
          scopeId={scopeId}
          timelineTabType="flyout"
          handleOnEventClosed={handleOnEventClosed}
          isReadOnly={isReadOnly}
        />
      )}
    </StyledEuiFlyoutBody>
  );
};

const FlyoutBody = React.memo(FlyoutBodyComponent);

export { FlyoutBody };
