/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { useTimelineEventsDetails } from '../../../../timelines/containers/details';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';

import { useCorrelations } from '../../../right/hooks/use_correlations';
import { useLeftPanelContext } from '../../context';
import { useRouteSpy } from '../../../../common/utils/route/use_route_spy';
import { SecurityPageName } from '../../../../../common';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { EntityPanel } from '../../../right/components/entity_panel';
import { AlertsTable } from './alerts_table';

export const CORRELATIONS_TAB_ID = 'correlations-details';

/**
 * Correlations displayed in the document details expandable flyout left section under the Insights tab
 */
export const CorrelationsDetails: React.FC = () => {
  const { indexName, eventId } = useLeftPanelContext();

  const scopeId = 'flyout'; // TODO: update to use context

  // TODO: move this to a separate hook
  const [{ pageName }] = useRouteSpy();
  const sourcererScope =
    pageName === SecurityPageName.detections
      ? SourcererScopeName.detections
      : SourcererScopeName.default;

  const sourcererDataView = useSourcererDataView(sourcererScope);

  const [isEventDataLoading, eventData, _searchHit, dataAsNestedObject] = useTimelineEventsDetails({
    indexName,
    eventId,
    runtimeMappings: sourcererDataView.runtimeMappings,
    skip: !eventId,
  });

  const {
    loading: isCorrelationsLoading,
    error: correlationsError,
    ancestryAlertsIds,
    alertsBySessionIds,
    sameSourceAlertsIds,
  } = useCorrelations({
    eventId,
    dataAsNestedObject,
    dataFormattedForFieldBrowser: eventData,
    scopeId,
  });

  // TODO: handle errors

  const topLevelLoading = isEventDataLoading || isCorrelationsLoading;

  if (topLevelLoading) {
    return (
      <EuiFlexGroup justifyContent="spaceAround">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <>
      <EntityPanel
        title={`${ancestryAlertsIds.length} alerts related by ancestry`}
        iconType={'warning'}
        expandable={true}
        expanded={true}
      >
        <AlertsTable alertIds={ancestryAlertsIds} />
      </EntityPanel>

      <EuiSpacer />

      <EntityPanel
        title={`${sameSourceAlertsIds.length} alerts related by source event`}
        iconType={'warning'}
        expandable={true}
        expanded={true}
      >
        <AlertsTable alertIds={sameSourceAlertsIds} />
      </EntityPanel>

      <EuiSpacer />

      <EntityPanel
        title={`${alertsBySessionIds.length} alerts related by session`}
        iconType={'warning'}
        expandable={true}
        expanded={false}
      >
        <AlertsTable alertIds={alertsBySessionIds} />
      </EntityPanel>
    </>
  );
};

CorrelationsDetails.displayName = 'CorrelationsDetails';
