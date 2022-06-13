/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AlertsTableFlyoutBaseProps } from '@kbn/triggers-actions-ui-plugin/public';
import { EntityType, TimelineId } from '@kbn/timelines-plugin/common';
import { noop } from 'lodash/fp';
import React, { useCallback, useMemo, useState } from 'react';

import { buildHostNamesFilter } from '../../../../../../common/search_strategy';
import { HostRisk, useHostRiskScore } from '../../../../../risk_score/containers';
import { useHostIsolationTools } from '../use_host_isolation_tools';
import { FlyoutHeaderContent } from './header';
import { FlyoutBody } from './body';
import { FlyoutFooter } from './footer';
import { useTimelineEventsDetails } from '../../../../containers/details';
import { useSourcererDataView } from '../../../../../common/containers/sourcerer';
import { SourcererScopeName } from '../../../../../common/store/sourcerer/model';
import { useBasicDataFromDetailsData } from '../helpers';

export { FlyoutBody } from './body';
export { FlyoutHeader } from './header';
export { FlyoutFooter } from './footer';

export const useToGetInternalFlyout = () => {
  const { browserFields, docValueFields, runtimeMappings } = useSourcererDataView(
    SourcererScopeName.detections
  );
  const [alert, setAlert] = useState<{ id?: string; indexName?: string }>({
    id: undefined,
    indexName: undefined,
  });

  const [loading, detailsData, rawEventData, ecsData, refetchFlyoutData] = useTimelineEventsDetails(
    {
      docValueFields,
      entityType: EntityType.EVENTS,
      indexName: alert.indexName ?? '',
      eventId: alert.id ?? '',
      runtimeMappings,
      skip: !alert.id,
    }
  );

  const { alertId, isAlert, hostName, ruleName, timestamp } =
    useBasicDataFromDetailsData(detailsData);

  const [hostRiskLoading, { data, isModuleEnabled }] = useHostRiskScore({
    filterQuery: hostName ? buildHostNamesFilter([hostName]) : undefined,
    pagination: {
      cursorStart: 0,
      querySize: 1,
    },
  });

  const hostRisk: HostRisk | null = useMemo(
    () =>
      data
        ? {
            loading: hostRiskLoading,
            isModuleEnabled,
            result: data,
          }
        : null,
    [data, hostRiskLoading, isModuleEnabled]
  );

  const {
    isolateAction,
    isHostIsolationPanelOpen,
    isIsolateActionSuccessBannerVisible,
    handleIsolationActionSuccess,
    showAlertDetails,
    showHostIsolationPanel,
  } = useHostIsolationTools();

  const body = useCallback(
    ({ isLoading, alert: localAlert }: AlertsTableFlyoutBaseProps) => {
      setAlert((prevAlert) => {
        if (prevAlert.id !== localAlert._id) {
          return { id: localAlert._id, indexName: localAlert._index };
        }
        return prevAlert;
      });

      return (
        <FlyoutBody
          alertId={alertId}
          browserFields={browserFields}
          detailsData={detailsData}
          event={{ eventId: localAlert._id, indexName: localAlert._index }}
          hostName={hostName ?? ''}
          hostRisk={hostRisk}
          handleIsolationActionSuccess={handleIsolationActionSuccess}
          handleOnEventClosed={noop}
          isAlert={isAlert}
          isDraggable={false}
          isolateAction={isolateAction}
          isIsolateActionSuccessBannerVisible={isIsolateActionSuccessBannerVisible}
          isHostIsolationPanelOpen={isHostIsolationPanelOpen}
          loading={isLoading || loading}
          rawEventData={rawEventData}
          showAlertDetails={showAlertDetails}
          timelineId={TimelineId.casePage}
          isReadOnly={false}
        />
      );
    },
    [
      alertId,
      browserFields,
      detailsData,
      handleIsolationActionSuccess,
      hostName,
      hostRisk,
      isAlert,
      isHostIsolationPanelOpen,
      isIsolateActionSuccessBannerVisible,
      isolateAction,
      loading,
      rawEventData,
      showAlertDetails,
    ]
  );

  const header = useCallback(
    ({ isLoading }: AlertsTableFlyoutBaseProps) => {
      return (
        <FlyoutHeaderContent
          isHostIsolationPanelOpen={isHostIsolationPanelOpen}
          isAlert={isAlert}
          isolateAction={isolateAction}
          loading={isLoading || loading}
          ruleName={ruleName}
          showAlertDetails={showAlertDetails}
          timestamp={timestamp}
        />
      );
    },
    [
      isAlert,
      isHostIsolationPanelOpen,
      isolateAction,
      loading,
      ruleName,
      showAlertDetails,
      timestamp,
    ]
  );

  const footer = useCallback(
    ({ isLoading, alert: localAlert }: AlertsTableFlyoutBaseProps) => {
      return (
        <FlyoutFooter
          detailsData={detailsData}
          detailsEcsData={ecsData}
          expandedEvent={{ eventId: localAlert._id, indexName: localAlert._index }}
          refetchFlyoutData={refetchFlyoutData}
          handleOnEventClosed={noop}
          isHostIsolationPanelOpen={isHostIsolationPanelOpen}
          isReadOnly={false}
          loadingEventDetails={isLoading || loading}
          onAddIsolationStatusClick={showHostIsolationPanel}
          timelineId={TimelineId.casePage}
        />
      );
    },
    [
      detailsData,
      ecsData,
      isHostIsolationPanelOpen,
      loading,
      refetchFlyoutData,
      showHostIsolationPanel,
    ]
  );

  return useMemo(
    () => ({
      body,
      header,
      footer,
    }),
    [body, header, footer]
  );
};
