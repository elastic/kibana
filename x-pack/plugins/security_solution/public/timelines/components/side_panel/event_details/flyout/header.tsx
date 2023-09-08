/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyoutHeader } from '@elastic/eui';
import React from 'react';

import { ExpandableEventTitle } from '../expandable_event';
import { BackToAlertDetailsLink } from './back_to_alert_details_link';

interface FlyoutHeaderComponentProps {
  eventId: string;
  eventIndex: string;
  isAlert: boolean;
  isHostIsolationPanelOpen: boolean;
  isolateAction: 'isolateHost' | 'unisolateHost';
  loading: boolean;
  promptContextId?: string;
  ruleName: string;
  showAlertDetails: () => void;
  timestamp: string;
}

const FlyoutHeaderContentComponent = ({
  eventId,
  eventIndex,
  isAlert,
  isHostIsolationPanelOpen,
  isolateAction,
  loading,
  promptContextId,
  ruleName,
  showAlertDetails,
  timestamp,
}: FlyoutHeaderComponentProps) => {
  return (
    <>
      {isHostIsolationPanelOpen ? (
        <BackToAlertDetailsLink isolateAction={isolateAction} showAlertDetails={showAlertDetails} />
      ) : (
        <ExpandableEventTitle
          eventId={eventId}
          eventIndex={eventIndex}
          isAlert={isAlert}
          loading={loading}
          promptContextId={promptContextId}
          ruleName={ruleName}
          timestamp={timestamp}
        />
      )}
    </>
  );
};
const FlyoutHeaderContent = React.memo(FlyoutHeaderContentComponent);

const FlyoutHeaderComponent = ({
  eventId,
  eventIndex,
  isAlert,
  isHostIsolationPanelOpen,
  isolateAction,
  loading,
  promptContextId,
  ruleName,
  showAlertDetails,
  timestamp,
}: FlyoutHeaderComponentProps) => {
  return (
    <EuiFlyoutHeader hasBorder={isHostIsolationPanelOpen}>
      <FlyoutHeaderContentComponent
        eventId={eventId}
        eventIndex={eventIndex}
        isAlert={isAlert}
        isHostIsolationPanelOpen={isHostIsolationPanelOpen}
        isolateAction={isolateAction}
        loading={loading}
        promptContextId={promptContextId}
        ruleName={ruleName}
        showAlertDetails={showAlertDetails}
        timestamp={timestamp}
      />
    </EuiFlyoutHeader>
  );
};

const FlyoutHeader = React.memo(FlyoutHeaderComponent);

export { FlyoutHeader, FlyoutHeaderContent };
