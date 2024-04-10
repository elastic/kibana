/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyoutHeader } from '@elastic/eui';
import React, { useMemo } from 'react';

import { SENTINEL_ONE_AGENT_ID_FIELD } from '../../../../../common/utils/sentinelone_alert_check';
import type { GetFieldsData } from '../../../../../common/hooks/use_get_fields_data';
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
  scopeId: string;
  refetchFlyoutData: () => Promise<void>;
  getFieldsData: GetFieldsData;
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
  scopeId,
  refetchFlyoutData,
  getFieldsData,
}: FlyoutHeaderComponentProps) => {
  const isSentinelOneAlert = useMemo(
    () => !!(isAlert && getFieldsData(SENTINEL_ONE_AGENT_ID_FIELD)?.length),
    [getFieldsData, isAlert]
  );

  return (
    <>
      {isHostIsolationPanelOpen ? (
        <BackToAlertDetailsLink
          isolateAction={isolateAction}
          showAlertDetails={showAlertDetails}
          showExperimentalBadge={isSentinelOneAlert}
        />
      ) : (
        <ExpandableEventTitle
          eventId={eventId}
          eventIndex={eventIndex}
          isAlert={isAlert}
          loading={loading}
          promptContextId={promptContextId}
          ruleName={ruleName}
          timestamp={timestamp}
          scopeId={scopeId}
          refetchFlyoutData={refetchFlyoutData}
          getFieldsData={getFieldsData}
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
  scopeId,
  refetchFlyoutData,
  getFieldsData,
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
        scopeId={scopeId}
        refetchFlyoutData={refetchFlyoutData}
        getFieldsData={getFieldsData}
      />
    </EuiFlyoutHeader>
  );
};

const FlyoutHeader = React.memo(FlyoutHeaderComponent);

export { FlyoutHeader, FlyoutHeaderContent };
